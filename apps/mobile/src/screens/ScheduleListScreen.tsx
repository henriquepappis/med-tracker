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

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${medication.name} schedules` });
  }, [navigation, medication.name]);

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
