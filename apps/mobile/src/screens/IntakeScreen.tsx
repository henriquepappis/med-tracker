import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList, Intake, Medication, Schedule } from '../navigation/types';

const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const scheduleSummary = (schedule: Schedule) => {
  if (schedule.recurrence_type === 'interval') {
    return `Every ${schedule.interval_hours ?? 0} hours`;
  }

  const times = schedule.times?.length ? schedule.times.join(', ') : 'No times';
  if (schedule.recurrence_type === 'weekly') {
    const days = schedule.weekdays?.length ? schedule.weekdays.join(', ') : 'No weekdays';
    return `${days} · ${times}`;
  }

  return `Daily · ${times}`;
};

const scheduleOccursToday = (schedule: Schedule) => {
  if (schedule.recurrence_type === 'interval') {
    return true;
  }
  if (schedule.recurrence_type === 'daily') {
    return true;
  }

  const todayKey = weekdays[new Date().getDay()];
  return schedule.weekdays?.map((day) => day.toLowerCase()).includes(todayKey) ?? false;
};

type Props = NativeStackScreenProps<AppStackParamList, 'Intakes'>;

type Tab = 'today' | 'history';

type Range = 7 | 30;

export default function IntakeScreen({ navigation }: Props) {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [rangeDays, setRangeDays] = useState<Range>(7);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Intakes' });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const meds = await api.get<Medication[]>('/medications', token);
      const scheduleLists = await Promise.all(
        meds.map(async (med) => api.get<Schedule[]>(`/medications/${med.id}/schedules`, token))
      );
      const flatSchedules = scheduleLists.flat().filter((schedule) => schedule.is_active);
      const intakeList = await api.get<Intake[]>('/intakes', token);

      setMedications(meds);
      setSchedules(flatSchedules);
      setIntakes(intakeList);
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
        await logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load intakes');
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const medicationMap = useMemo(() => {
    return new Map(medications.map((med) => [med.id, med]));
  }, [medications]);

  const scheduleMap = useMemo(() => {
    return new Map(schedules.map((schedule) => [schedule.id, schedule]));
  }, [schedules]);

  const todayIntakes = useMemo(() => {
    const today = new Date();
    return intakes.filter((intake) => {
      const date = new Date(intake.taken_at);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }, [intakes]);

  const historyGroups = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);

    const filtered = intakes.filter((intake) => new Date(intake.taken_at) >= cutoff);
    const groups = new Map<string, Intake[]>();

    filtered.forEach((intake) => {
      const day = formatDate(intake.taken_at);
      const list = groups.get(day) ?? [];
      list.push(intake);
      groups.set(day, list);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items: items.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()),
    }));
  }, [intakes, rangeDays]);

  const recordIntake = async (scheduleId: number, status: 'taken' | 'skipped') => {
    if (!token) {
      return;
    }

    try {
      await api.post(
        '/intakes',
        {
          schedule_id: scheduleId,
          status,
          taken_at: new Date().toISOString(),
        },
        token
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record intake');
    }
  };

  const todayScheduleStatus = useMemo(() => {
    const map = new Map<number, Intake>();
    todayIntakes.forEach((intake) => {
      map.set(intake.schedule_id, intake);
    });
    return map;
  }, [todayIntakes]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'today' && styles.tabButtonActive]}
          onPress={() => setTab('today')}
        >
          <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'today' ? (
        <FlatList
          data={schedules.filter(scheduleOccursToday)}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.empty}>No schedules for today.</Text>}
          renderItem={({ item }) => {
            const medication = medicationMap.get(item.medication_id);
            const status = todayScheduleStatus.get(item.id);

            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{medication?.name ?? 'Medication'}</Text>
                <Text style={styles.cardSubtitle}>{scheduleSummary(item)}</Text>
                {status ? (
                  <Text style={styles.statusText}>
                    {status.status.toUpperCase()} · {formatTime(status.taken_at)}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={() => recordIntake(item.id, 'taken')}
                  >
                    <Text style={styles.successButtonText}>Taken</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => recordIntake(item.id, 'skipped')}
                  >
                    <Text style={styles.secondaryButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.historyContainer}>
          <View style={styles.rangeRow}>
            <TouchableOpacity
              style={[styles.rangeButton, rangeDays === 7 && styles.rangeButtonActive]}
              onPress={() => setRangeDays(7)}
            >
              <Text style={[styles.rangeText, rangeDays === 7 && styles.rangeTextActive]}>7 days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rangeButton, rangeDays === 30 && styles.rangeButtonActive]}
              onPress={() => setRangeDays(30)}
            >
              <Text style={[styles.rangeText, rangeDays === 30 && styles.rangeTextActive]}>30 days</Text>
            </TouchableOpacity>
          </View>
          {historyGroups.length === 0 ? (
            <Text style={styles.empty}>No intakes yet.</Text>
          ) : (
            <FlatList
              data={historyGroups}
              keyExtractor={(item) => item.date}
              renderItem={({ item }) => (
                <View style={styles.historyGroup}>
                  <Text style={styles.historyTitle}>{item.date}</Text>
                  {item.items.map((intake) => {
                    const medication = medicationMap.get(intake.medication_id);
                    const schedule = scheduleMap.get(intake.schedule_id);
                    return (
                      <View key={intake.id} style={styles.historyItem}>
                        <Text style={styles.historyMedication}>{medication?.name ?? 'Medication'}</Text>
                        <Text style={styles.historyMeta}>
                          {schedule ? scheduleSummary(schedule) : 'Schedule'} · {intake.status} · {formatTime(intake.taken_at)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  tabButtonActive: {
    backgroundColor: '#1b1b1b',
  },
  tabText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    marginTop: 6,
    color: '#6a6660',
  },
  statusText: {
    marginTop: 8,
    color: '#1b1b1b',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  successButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1b1b1b',
  },
  successButtonText: {
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
  secondaryButtonText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  empty: {
    color: '#7d7a75',
    marginTop: 12,
  },
  historyContainer: {
    flex: 1,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  rangeButtonActive: {
    backgroundColor: '#1b1b1b',
  },
  rangeText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  rangeTextActive: {
    color: '#fff',
  },
  historyGroup: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a6660',
    marginBottom: 8,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyMedication: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyMeta: {
    marginTop: 4,
    color: '#6a6660',
    fontSize: 12,
  },
});
