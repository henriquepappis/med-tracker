import { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import Toast from '../components/Toast';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cacheGet, cacheSet } from '../services/offlineCache';
import type { AppStackParamList, Schedule } from '../navigation/types';
import {
  disableNotifications,
  getNotificationDebugInfo,
  isRemindersEnabled,
  setRemindersEnabled,
  syncNotifications,
  type NotificationDebugInfo,
} from '../services/notifications';

const weekdayKeys: Record<string, string> = {
  mon: 'weekdays.mon',
  tue: 'weekdays.tue',
  wed: 'weekdays.wed',
  thu: 'weekdays.thu',
  fri: 'weekdays.fri',
  sat: 'weekdays.sat',
  sun: 'weekdays.sun',
};

type Props = NativeStackScreenProps<AppStackParamList, 'Schedules'>;

export default function ScheduleListScreen({ navigation, route }: Props) {
  const { token, logout } = useAuth();
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { medication } = route.params;
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabledState] = useState(false);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<NotificationDebugInfo | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleReadOnly = useCallback(() => {
    Alert.alert(t('offline.readOnlyTitle'), t('offline.readOnlyMessage'));
  }, [t]);

  const loadFromCache = useCallback(async () => {
    const cached = await cacheGet<Schedule[]>(`schedules:${medication.id}`);
    if (cached) {
      setItems(cached.data);
      setLastUpdated(cached.updatedAt);
      setError(null);
      return;
    }
    setError(t('offline.noCache'));
  }, [medication.id, t]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('navigation.schedules', { name: medication.name }) });
  }, [navigation, medication.name, t]);

  useLayoutEffect(() => {
    const loadReminders = async () => {
      if (isOffline) {
        setDebugInfo(null);
        setDebugError(null);
        return;
      }
      const enabled = await isRemindersEnabled();
      setRemindersEnabledState(enabled);
      if (token) {
        setDebugLoading(true);
        setDebugError(null);
        try {
          const info = await getNotificationDebugInfo(token);
          setDebugInfo(info);
        } catch (err) {
          setDebugError(err instanceof Error ? err.message : t('errors.loadRemindersDebug'));
        } finally {
          setDebugLoading(false);
        }
      }
    };
    loadReminders();
  }, [token, t, isOffline]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      await loadFromCache();
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    try {
      const data = await api.get<Schedule[]>(`/medications/${medication.id}/schedules`, token);
      setItems(data);
      const cached = await cacheSet(`schedules:${medication.id}`, data);
      setLastUpdated(cached.updatedAt);
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
        await logout();
        return;
      }
      const status = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : null;
      if (!status) {
        await loadFromCache();
      } else {
        setError(err instanceof Error ? err.message : t('errors.loadSchedules'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isOffline, loadFromCache, medication.id, logout, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const handleToggleReminders = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      handleReadOnly();
      return;
    }
    setRemindersBusy(true);
    setRemindersError(null);
    try {
      if (remindersEnabled) {
        await disableNotifications();
        await setRemindersEnabled(false);
        setRemindersEnabledState(false);
      } else {
        await syncNotifications(token);
        await setRemindersEnabled(true);
        setRemindersEnabledState(true);
      }
      const info = await getNotificationDebugInfo(token);
      setDebugInfo(info);
    } catch (err) {
      setRemindersError(err instanceof Error ? err.message : t('errors.updateReminders'));
    } finally {
      setRemindersBusy(false);
    }
  }, [token, remindersEnabled, t, isOffline, handleReadOnly]);

  const handleRefreshDebug = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      handleReadOnly();
      return;
    }
    setDebugLoading(true);
    setDebugError(null);
    try {
      const info = await getNotificationDebugInfo(token);
      setDebugInfo(info);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : t('errors.loadRemindersDebug'));
    } finally {
      setDebugLoading(false);
    }
  }, [token, t, isOffline, handleReadOnly]);

  const handleDeactivate = useCallback(
    (item: Schedule) => {
      Alert.alert(t('schedules.deactivateTitle'), t('schedules.deactivateMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('schedules.deactivate'),
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              return;
            }
            try {
              await api.delete(`/schedules/${item.id}`, token);
              setItems((prev) => prev.filter((schedule) => schedule.id !== item.id));
              setToast(t('success.deactivated'));
            } catch (err) {
              setError(err instanceof Error ? err.message : t('errors.deactivateSchedule'));
            }
          },
        },
      ]);
    },
    [token, t]
  );

  const renderSummary = (schedule: Schedule) => {
    if (schedule.recurrence_type === 'interval') {
      return t('schedules.summary.interval', { hours: schedule.interval_hours ?? 0 });
    }

    const times = schedule.times?.length ? schedule.times.join(', ') : t('schedules.noTimes');

    if (schedule.recurrence_type === 'weekly') {
      const weekdays = schedule.weekdays?.length
        ? schedule.weekdays
            .map((day) => t(weekdayKeys[day] ?? day))
            .join(', ')
        : t('schedules.weekdaysLabel');
      return t('schedules.summary.weekly', { weekdays, times });
    }

    return t('schedules.summary.daily', { times });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ListSkeleton rows={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {remindersError ? <Text style={styles.error}>{remindersError}</Text> : null}
      {debugError ? <Text style={styles.error}>{debugError}</Text> : null}

      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      <View style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <View>
            <Text style={styles.reminderTitle}>{t('schedules.remindersTitle')}</Text>
            <Text style={styles.reminderNote}>{t('schedules.remindersNote')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.secondaryButton, remindersEnabled && styles.secondaryButtonActive]}
            onPress={handleToggleReminders}
            disabled={remindersBusy}
          >
            <Text
              style={[styles.secondaryButtonText, remindersEnabled && styles.secondaryButtonTextActive]}
            >
              {remindersEnabled ? t('common.disable') : t('common.enable')}
            </Text>
          </TouchableOpacity>
        </View>
        {debugInfo ? (
          <View style={styles.debugBlock}>
            <Text style={styles.debugText}>
              {t('schedules.debug.enabled')}: {debugInfo.enabled ? t('common.yes') : t('common.no')} · {t('schedules.debug.permission')}: {debugInfo.permissionGranted ? t('common.yes') : t('common.no')} {debugInfo.permissionStatus ? `(status ${debugInfo.permissionStatus})` : ''}
            </Text>
            <Text style={styles.debugText}>{t('schedules.debug.timezone')}: {debugInfo.timezone ?? t('common.notSet')}</Text>
            <Text style={styles.debugText}>{t('schedules.debug.scheduled')}: {debugInfo.scheduledCount}</Text>
            {debugInfo.scheduledTimes.length > 0 ? (
              debugInfo.scheduledTimes.map((time) => (
                <Text key={time} style={styles.debugText}>
                  - {time}
                </Text>
              ))
            ) : (
              <Text style={styles.debugText}>{t('common.noUpcomingNotifications')}</Text>
            )}
          </View>
        ) : null}
        <TouchableOpacity style={styles.debugButton} onPress={handleRefreshDebug} disabled={debugLoading}>
          <Text style={styles.debugButtonText}>{debugLoading ? t('common.loading') : t('common.refreshDebug')}</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title={t('schedules.noItems')}
          message={t('schedules.emptyCta')}
          action={(
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                isOffline ? handleReadOnly() : navigation.navigate('ScheduleForm', { medication })
              }
            >
              <Text style={styles.primaryButtonText}>{t('schedules.saveSchedule')}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{renderSummary(item)}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t(`schedules.${item.recurrence_type}` as const)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => (isOffline ? handleReadOnly() : handleDeactivate(item))}
              >
                <Text style={styles.dangerButtonText}>{t('schedules.deactivate')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          isOffline ? handleReadOnly() : navigation.navigate('ScheduleForm', { medication })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
    padding: 20,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f0ede8',
  },
  badgeText: {
    color: '#6a6660',
    fontSize: 11,
    fontWeight: '600',
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  reminderNote: {
    color: '#7d7a75',
    marginTop: 4,
    fontSize: 12,
  },
  debugBlock: {
    marginTop: 12,
  },
  debugText: {
    color: '#4a4742',
    fontSize: 12,
    marginTop: 2,
  },
  debugButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  debugButtonText: {
    color: '#1b1b1b',
    fontWeight: '600',
    fontSize: 12,
  },
  dangerButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#b00020',
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#1b1b1b',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  secondaryButtonActive: {
    backgroundColor: '#1b1b1b',
  },
  secondaryButtonText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  secondaryButtonTextActive: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1b1b',
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    marginBottom: 2,
  },
});
