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

      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

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
