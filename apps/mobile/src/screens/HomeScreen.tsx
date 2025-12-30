import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import Toast from '../components/Toast';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cacheGet, cacheSet } from '../services/offlineCache';
import { disableNotifications, isRemindersEnabled, setRemindersEnabled, syncNotifications } from '../services/notifications';
import { getQueuedIntakes } from '../services/offlineIntakeQueue';
import type { AppStackParamList, Intake, Medication, Schedule } from '../navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

type UpcomingDose = {
  id: string;
  medicationName: string;
  whenLabel: string;
  sortKey: number;
};

const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const formatTime = (value: Date) =>
  value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const scheduleOccursOnDate = (schedule: Schedule, date: Date) => {
  if (schedule.recurrence_type === 'daily') {
    return true;
  }
  if (schedule.recurrence_type === 'weekly') {
    const dayKey = weekdays[date.getDay()];
    return schedule.weekdays?.map((day) => day.toLowerCase()).includes(dayKey) ?? false;
  }
  return false;
};

export default function HomeScreen() {
  const { token, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remindersEnabled, setRemindersEnabledState] = useState(false);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    const medsCache = await cacheGet<Medication[]>('medications');
    if (!medsCache) {
      setError(t('offline.noCache'));
      setLoading(false);
      return;
    }
    const schedulesLists = await Promise.all(
      medsCache.data.map(async (med) => {
        const cached = await cacheGet<Schedule[]>(`schedules:${med.id}`);
        return cached?.data ?? [];
      })
    );
    const queued = await getQueuedIntakes();
    const flatSchedules = schedulesLists.flat().filter((schedule) => schedule.is_active);
    const queuedIntakes: Intake[] = queued.map((action, index) => {
      const schedule = flatSchedules.find((item) => item.id === action.scheduleId);
      return {
        id: -1 * (index + 1),
        schedule_id: action.scheduleId,
        medication_id: schedule?.medication_id ?? 0,
        status: action.status,
        taken_at: action.takenAt,
      };
    });
    setMedications(medsCache.data);
    setSchedules(flatSchedules);
    setIntakes(queuedIntakes);
    setLastUpdated(medsCache.updatedAt);
    setError(null);
    setLoading(false);
  }, [t]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      await loadFromCache();
      return;
    }
    setError(null);
    try {
      const data = await api.get<Medication[]>('/medications', token);
      const scheduleLists = await Promise.all(
        data.map(async (med) => api.get<Schedule[]>(`/medications/${med.id}/schedules`, token))
      );
      const intakeList = await api.get<Intake[]>('/intakes', token);
      setMedications(data);
      setSchedules(scheduleLists.flat().filter((schedule) => schedule.is_active));
      setIntakes(intakeList);
      const cached = await cacheSet('medications', data);
      setLastUpdated(cached.updatedAt);
      await Promise.all(
        data.map((med, index) => cacheSet(`schedules:${med.id}`, scheduleLists[index] ?? []))
      );
    } catch (err) {
      const status = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : null;
      if (!status) {
        await loadFromCache();
      } else {
        setError(err instanceof Error ? err.message : t('errors.loadMedications'));
      }
    } finally {
      setLoading(false);
    }
  }, [token, isOffline, loadFromCache, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      void isRemindersEnabled().then(setRemindersEnabledState);
    }, [load])
  );

  const handleToggleReminders = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      setToast(t('offline.readOnlyMessage'));
      return;
    }
    setRemindersBusy(true);
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
    } catch (err) {
      setToast(err instanceof Error ? err.message : t('errors.updateReminders'));
    } finally {
      setRemindersBusy(false);
    }
  }, [token, isOffline, remindersEnabled, t]);

  const upcoming = useMemo<UpcomingDose[]>(() => {
    const now = new Date();
    const items: UpcomingDose[] = [];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayLabel = tomorrow.toLocaleDateString(i18n.language || undefined, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });

    schedules.filter((schedule) => scheduleOccursOnDate(schedule, tomorrow)).forEach((schedule) => {
      const med = medications.find((item) => item.id === schedule.medication_id);
      if (!med || !schedule.times?.length) {
        return;
      }
      schedule.times.forEach((time) => {
        const [hours, minutes] = time.split(':').map((value) => Number(value));
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
          return;
        }
        const occurrence = new Date(tomorrow);
        occurrence.setHours(hours, minutes, 0, 0);
        items.push({
          id: `${schedule.id}-${time}-${dayLabel}`,
          medicationName: med.name,
          whenLabel: `${dayLabel} · ${formatTime(occurrence)}`,
          sortKey: occurrence.getTime(),
        });
      });
    });

    return items.sort((a, b) => a.sortKey - b.sortKey).slice(0, 3);
  }, [medications, schedules, i18n.language]);

  const todayMetrics = useMemo(() => {
    const todaySchedules = schedules.filter((schedule) => scheduleOccursOnDate(schedule, new Date()));
    let expected = 0;
    todaySchedules.forEach((schedule) => {
      if (schedule.recurrence_type === 'interval') {
        return;
      }
      expected += schedule.times?.length ?? 0;
    });

    const today = new Date();
    const todayIntakes = intakes.filter((intake) => {
      const date = new Date(intake.taken_at);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
    const taken = todayIntakes.filter((intake) => intake.status === 'taken').length;
    const skipped = todayIntakes.filter((intake) => intake.status === 'skipped').length;
    const effectiveTaken = Math.min(taken, expected);
    return {
      expected,
      taken,
      pending: Math.max(expected - taken - skipped, 0),
      adherence: expected > 0 ? Math.round((effectiveTaken / expected) * 100) : 0,
    };
  }, [schedules, intakes]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return t('home.morning');
    }
    if (hour < 18) {
      return t('home.afternoon');
    }
    return t('home.evening');
  }, [t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ListSkeleton rows={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner isOffline={isOffline} lastUpdated={lastUpdated} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.statusTitle')}</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusPill, styles.statusPillInteractive]}
            onPress={handleToggleReminders}
            disabled={remindersBusy}
          >
            <Text style={styles.statusLabel}>{t('home.reminders')}</Text>
            <Text style={styles.statusValue}>
              {remindersEnabled ? t('home.remindersOn') : t('home.remindersOff')}
            </Text>
          </TouchableOpacity>
          <View style={styles.statusPill}>
            <Text style={styles.statusLabel}>{t('home.medications')}</Text>
            <Text style={styles.statusValue}>{medications.length}</Text>
          </View>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('home.metricsExpected')}</Text>
            <Text style={styles.metricValue}>{todayMetrics.expected}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('home.metricsTaken')}</Text>
            <Text style={styles.metricValue}>{todayMetrics.taken}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('home.metricsPending')}</Text>
            <Text style={styles.metricValue}>{todayMetrics.pending}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('home.metricsAdherence')}</Text>
            <Text style={styles.metricValue}>{todayMetrics.adherence}%</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Medications')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="medkit-outline" size={18} color="#1b1b1b" />
          </View>
          <Text style={styles.actionTitle}>{t('navigation.medications')}</Text>
          <Text style={styles.actionSubtitle}>{t('home.actionMedications')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Medications')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="time-outline" size={18} color="#1b1b1b" />
          </View>
          <Text style={styles.actionTitle}>{t('home.actionSchedules')}</Text>
          <Text style={styles.actionSubtitle}>{t('home.actionSchedulesHelp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Intakes')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1b1b1b" />
          </View>
          <Text style={styles.actionTitle}>{t('navigation.intakes')}</Text>
          <Text style={styles.actionSubtitle}>{t('home.actionIntakes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="settings-outline" size={18} color="#1b1b1b" />
          </View>
          <Text style={styles.actionTitle}>{t('settings.title')}</Text>
          <Text style={styles.actionSubtitle}>{t('home.actionSettings')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('home.upcoming')}</Text>
      {upcoming.length === 0 ? (
        <EmptyState
          title={t('home.noUpcoming')}
          message={t('home.noUpcomingHelp')}
          action={(
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Medications')}
            >
              <Text style={styles.primaryButtonText}>{t('medications.emptyCta')}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.upcomingCard}>
              <Text style={styles.upcomingTime}>{item.whenLabel}</Text>
              <Text style={styles.upcomingMedication}>{item.medicationName}</Text>
            </View>
          )}
        />
      )}
      {toast ? <Toast message={toast} type="error" onHide={() => setToast(null)} /> : null}
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
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  subtitle: {
    color: '#6a6660',
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  logoutText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a6660',
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  statusPill: {
    flex: 1,
    backgroundColor: '#f0ede8',
    borderRadius: 12,
    padding: 12,
  },
  statusPillInteractive: {
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  statusLabel: {
    color: '#6a6660',
    fontSize: 12,
  },
  statusValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  metricsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0ede8',
  },
  metricLabel: {
    color: '#6a6660',
    fontSize: 11,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0ede8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    marginTop: 6,
    color: '#6a6660',
    fontSize: 12,
  },
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  upcomingTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  upcomingMedication: {
    marginTop: 4,
    color: '#6a6660',
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
});
