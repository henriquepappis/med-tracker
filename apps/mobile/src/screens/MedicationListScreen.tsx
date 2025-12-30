import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import Toast from '../components/Toast';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cacheGet, cacheSet } from '../services/offlineCache';
import type { AppStackParamList, Medication, Schedule } from '../navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const weekdayKeys: Record<string, string> = {
  mon: 'weekdays.mon',
  tue: 'weekdays.tue',
  wed: 'weekdays.wed',
  thu: 'weekdays.thu',
  fri: 'weekdays.fri',
  sat: 'weekdays.sat',
  sun: 'weekdays.sun',
};

export default function MedicationListScreen() {
  const { token, logout } = useAuth();
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const [items, setItems] = useState<Medication[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<number, Schedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    const cached = await cacheGet<Medication[]>('medications');
    if (cached) {
      setItems(cached.data);
      const scheduleEntries = await Promise.all(
        cached.data.map(async (med) => {
          const scheduleCache = await cacheGet<Schedule[]>(`schedules:${med.id}`);
          return [med.id, scheduleCache?.data ?? []] as const;
        })
      );
      const map: Record<number, Schedule[]> = {};
      scheduleEntries.forEach(([medId, schedules]) => {
        map[medId] = schedules;
      });
      setScheduleMap(map);
      setLastUpdated(cached.updatedAt);
      setError(null);
      return;
    }
    setError(t('offline.noCache'));
  }, [t]);

  const handleReadOnly = useCallback(() => {
    Alert.alert(t('offline.readOnlyTitle'), t('offline.readOnlyMessage'));
  }, [t]);

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
      const data = await api.get<Medication[]>('/medications', token);
      setItems(data);
      const cached = await cacheSet('medications', data);
      setLastUpdated(cached.updatedAt);
      const scheduleLists = await Promise.all(
        data.map(async (med) => api.get<Schedule[]>(`/medications/${med.id}/schedules`, token))
      );
      const map: Record<number, Schedule[]> = {};
      scheduleLists.forEach((schedules, index) => {
        map[data[index].id] = schedules;
      });
      setScheduleMap(map);
      await Promise.all(
        data.map((med, index) => cacheSet(`schedules:${med.id}`, scheduleLists[index] ?? []))
      );
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
        await logout();
        return;
      }
      const status = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : null;
      if (!status) {
        await loadFromCache();
      } else {
        setError(err instanceof Error ? err.message : t('errors.loadMedications'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isOffline, loadFromCache, logout, t]);

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
    (item: Medication) => {
      Alert.alert(t('medications.deactivateTitle'), t('medications.deactivateMessage', { name: item.name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('medications.deactivate'),
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              return;
            }
            try {
              await api.delete(`/medications/${item.id}`, token);
              setItems((prev) => prev.filter((med) => med.id !== item.id));
              setToast(t('success.deactivated'));
            } catch (err) {
              setError(err instanceof Error ? err.message : t('errors.deactivateMedication'));
            }
          },
        },
      ]);
    },
    [token, t]
  );

  const renderScheduleSummary = useCallback(
    (schedule: Schedule) => {
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
    },
    [t]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton rows={3} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('medications.title')}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navPill} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navText}>{t('navigation.home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navPill} onPress={() => navigation.navigate('Intakes')}>
          <Text style={styles.navText}>{t('navigation.intakes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navPill} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navText}>{t('settings.title')}</Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {items.length === 0 ? (
        <EmptyState
          title={t('medications.noItems')}
          message={t('medications.emptyCta')}
          action={(
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => (isOffline ? handleReadOnly() : navigation.navigate('MedicationForm', {}))}
            >
              <Text style={styles.primaryButtonText}>{t('medications.createTitle')}</Text>
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
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.dosage}</Text>
              {item.instructions ? (
                <Text style={styles.cardNote}>{item.instructions}</Text>
              ) : null}
              <View style={styles.scheduleBlock}>
                <Text style={styles.scheduleLabel}>{t('schedules.title')}</Text>
                {(() => {
                  const activeSchedules = scheduleMap[item.id]?.filter((schedule) => schedule.is_active) ?? [];
                  if (activeSchedules.length === 0) {
                    return <Text style={styles.scheduleEmpty}>{t('schedules.noItems')}</Text>;
                  }
                  return (
                    <>
                      {activeSchedules.slice(0, 2).map((schedule) => (
                        <Text key={schedule.id} style={styles.scheduleLine}>
                          {renderScheduleSummary(schedule)}
                        </Text>
                      ))}
                      {activeSchedules.length > 2 ? (
                        <Text style={styles.scheduleMore}>+{activeSchedules.length - 2}</Text>
                      ) : null}
                    </>
                  );
                })()}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Schedules', { medication: item })}
                >
                  <Text style={styles.secondaryButtonText}>{t('medications.schedules')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() =>
                    isOffline
                      ? handleReadOnly()
                      : navigation.navigate('MedicationForm', { medication: item })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{t('medications.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => (isOffline ? handleReadOnly() : handleDeactivate(item))}
                >
                  <Text style={styles.dangerButtonText}>{t('medications.deactivate')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => (isOffline ? handleReadOnly() : navigation.navigate('MedicationForm', {}))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  logoutText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  navPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1b1b1b',
    backgroundColor: '#fff',
  },
  navText: {
    color: '#1b1b1b',
    fontWeight: '600',
    fontSize: 12,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#333',
  },
  cardNote: {
    marginTop: 6,
    color: '#6a6660',
  },
  scheduleBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ede9e3',
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6a6660',
    marginBottom: 4,
  },
  scheduleLine: {
    fontSize: 12,
    color: '#1b1b1b',
    marginBottom: 2,
  },
  scheduleEmpty: {
    fontSize: 12,
    color: '#6a6660',
  },
  scheduleMore: {
    fontSize: 12,
    color: '#6a6660',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  secondaryButtonText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  dangerButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#b00020',
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
