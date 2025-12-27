import { useCallback, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList, Medication } from '../navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

export default function MedicationListScreen() {
  const { token, logout } = useAuth();
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const data = await api.get<Medication[]>('/medications', token);
      setItems(data);
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as Error & { status?: number }).status === 401) {
        await logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load medications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, logout]);

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
      Alert.alert('Deactivate medication', `Deactivate ${item.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              return;
            }
            try {
              await api.delete(`/medications/${item.id}`, token);
              setItems((prev) => prev.filter((med) => med.id !== item.id));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to deactivate medication');
            }
          },
        },
      ]);
    },
    [token]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Medications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Intakes')}>
            <Text style={styles.link}>Intakes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.link}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No medications yet.</Text>
        </View>
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
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Schedules', { medication: item })}
                >
                  <Text style={styles.secondaryButtonText}>Schedules</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('MedicationForm', { medication: item })}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => handleDeactivate(item)}
                >
                  <Text style={styles.dangerButtonText}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('MedicationForm', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  link: {
    color: '#1b1b1b',
    fontWeight: '600',
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
