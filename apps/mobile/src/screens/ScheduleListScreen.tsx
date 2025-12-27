import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList, Schedule } from '../navigation/types';
import {
  disableNotifications,
  getNotificationDebugInfo,
  isRemindersEnabled,
  setRemindersEnabled,
  syncNotifications,
  remindersPlatformNote,
  type NotificationDebugInfo,
} from '../services/notifications';

const weekdayLabels: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

type Props = NativeStackScreenProps<AppStackParamList, 'Schedules'>;

export default function ScheduleListScreen({ navigation, route }: Props) {
  const { token, logout } = useAuth();
  const { medication } = route.params;
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabledState] = useState(false);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<NotificationDebugInfo | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${medication.name} schedules` });
  }, [navigation, medication.name]);

  useLayoutEffect(() => {
    const loadReminders = async () => {
      const enabled = await isRemindersEnabled();
      setRemindersEnabledState(enabled);
      if (token) {
        setDebugLoading(true);
        setDebugError(null);
        try {
          const info = await getNotificationDebugInfo(token);
          setDebugInfo(info);
        } catch (err) {
          setDebugError(err instanceof Error ? err.message : 'Failed to load notification debug info');
        } finally {
          setDebugLoading(false);
        }
      }
    };
    loadReminders();
  }, [token]);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const data = await api.get<Schedule[]>(`/medications/${medication.id}/schedules`, token);
      setItems(data);
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
        await logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, medication.id, logout]);

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
      setRemindersError(err instanceof Error ? err.message : 'Failed to update reminders');
    } finally {
      setRemindersBusy(false);
    }
  }, [token, remindersEnabled]);

  const handleRefreshDebug = useCallback(async () => {
    if (!token) {
      return;
    }
    setDebugLoading(true);
    setDebugError(null);
    try {
      const info = await getNotificationDebugInfo(token);
      setDebugInfo(info);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Failed to load notification debug info');
    } finally {
      setDebugLoading(false);
    }
  }, [token]);

  const handleDeactivate = useCallback(
    (item: Schedule) => {
      Alert.alert('Deactivate schedule', 'Deactivate this schedule?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              return;
            }
            try {
              await api.delete(`/schedules/${item.id}`, token);
              setItems((prev) => prev.filter((schedule) => schedule.id !== item.id));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to deactivate schedule');
            }
          },
        },
      ]);
    },
    [token]
  );

  const renderSummary = (schedule: Schedule) => {
    if (schedule.recurrence_type === 'interval') {
      return `Every ${schedule.interval_hours ?? 0} hours`;
    }

    const times = schedule.times?.length ? schedule.times.join(', ') : 'No times';

    if (schedule.recurrence_type === 'weekly') {
      const weekdays = schedule.weekdays?.length
        ? schedule.weekdays
            .map((day) => weekdayLabels[day] ?? day)
            .join(', ')
        : 'No weekdays';
      return `${weekdays} · ${times}`;
    }

    return `Daily · ${times}`;
  };

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
      {remindersError ? <Text style={styles.error}>{remindersError}</Text> : null}
      {debugError ? <Text style={styles.error}>{debugError}</Text> : null}

      <View style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <View>
            <Text style={styles.reminderTitle}>Reminders</Text>
            <Text style={styles.reminderNote}>{remindersPlatformNote}</Text>
          </View>
          <TouchableOpacity
            style={[styles.secondaryButton, remindersEnabled && styles.secondaryButtonActive]}
            onPress={handleToggleReminders}
            disabled={remindersBusy}
          >
            <Text
              style={[styles.secondaryButtonText, remindersEnabled && styles.secondaryButtonTextActive]}
            >
              {remindersEnabled ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>
        {debugInfo ? (
          <View style={styles.debugBlock}>
            <Text style={styles.debugText}>
              Enabled: {debugInfo.enabled ? 'yes' : 'no'} · Permission: {debugInfo.permissionGranted ? 'granted' : 'denied'} {debugInfo.permissionStatus ? `(status ${debugInfo.permissionStatus})` : ''}
            </Text>
            <Text style={styles.debugText}>Timezone: {debugInfo.timezone ?? 'not set'}</Text>
            <Text style={styles.debugText}>Scheduled notifications: {debugInfo.scheduledCount}</Text>
            {debugInfo.scheduledTimes.length > 0 ? (
              debugInfo.scheduledTimes.map((time) => (
                <Text key={time} style={styles.debugText}>
                  - {time}
                </Text>
              ))
            ) : (
              <Text style={styles.debugText}>No upcoming notifications.</Text>
            )}
          </View>
        ) : null}
        <TouchableOpacity style={styles.debugButton} onPress={handleRefreshDebug} disabled={debugLoading}>
          <Text style={styles.debugButtonText}>{debugLoading ? 'Refreshing…' : 'Refresh debug'}</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No schedules yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.recurrence_type.toUpperCase()}</Text>
              <Text style={styles.cardSubtitle}>{renderSummary(item)}</Text>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => handleDeactivate(item)}
              >
                <Text style={styles.dangerButtonText}>Deactivate</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ScheduleForm', { medication })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#7d7a75',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6a6660',
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
  cardSubtitle: {
    marginTop: 6,
    fontSize: 16,
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
