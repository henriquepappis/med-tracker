import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { AppStackParamList } from '../navigation/types';

const weekdays = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

type Props = NativeStackScreenProps<AppStackParamList, 'ScheduleForm'>;

type RecurrenceType = 'daily' | 'weekly' | 'interval';

export default function ScheduleFormScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { medication } = route.params;
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [times, setTimes] = useState<string[]>([]);
  const [weekdaysSelected, setWeekdaysSelected] = useState<string[]>([]);
  const [intervalHours, setIntervalHours] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingTime, setPendingTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'New schedule' });
  }, [navigation]);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type !== 'set' || !date) {
        return;
      }
      const time = formatTime(date);
      setTimes((prev) => {
        if (prev.includes(time)) {
          return prev;
        }
        return [...prev, time].sort();
      });
      return;
    }

    if (date) {
      setPendingTime(date);
    }
  };

  const confirmTime = () => {
    const time = formatTime(pendingTime);
    setTimes((prev) => {
      if (prev.includes(time)) {
        return prev;
      }
      return [...prev, time].sort();
    });
    setShowTimePicker(false);
  };

  const toggleWeekday = (day: string) => {
    setWeekdaysSelected((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  };

  const validate = () => {
    if (recurrenceType === 'interval') {
      const value = Number(intervalHours);
      if (!intervalHours || Number.isNaN(value) || value < 1) {
        return 'Interval hours must be at least 1.';
      }
      return null;
    }

    if (times.length === 0) {
      return 'Add at least one time.';
    }

    if (recurrenceType === 'weekly' && weekdaysSelected.length === 0) {
      return 'Select at least one weekday.';
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!token) {
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      medication_id: medication.id,
      recurrence_type: recurrenceType,
    };

    if (recurrenceType === 'interval') {
      payload.interval_hours = Number(intervalHours);
    } else {
      payload.times = times;
      if (recurrenceType === 'weekly') {
        payload.weekdays = weekdaysSelected;
      }
    }

    try {
      await api.post('/schedules', payload, token);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Medication</Text>
      <Text style={styles.value}>{medication.name}</Text>

      <Text style={styles.label}>Recurrence</Text>
      <View style={styles.toggleRow}>
        {(['daily', 'weekly', 'interval'] as RecurrenceType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.toggleButton, recurrenceType === type && styles.toggleButtonActive]}
            onPress={() => setRecurrenceType(type)}
          >
            <Text
              style={[styles.toggleText, recurrenceType === type && styles.toggleTextActive]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {recurrenceType !== 'interval' ? (
        <>
          <Text style={styles.label}>Times</Text>
          <View style={styles.timeRow}>
            {times.length === 0 ? (
              <Text style={styles.helperText}>No times yet</Text>
            ) : (
              times.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.chip}
                  onPress={() => setTimes((prev) => prev.filter((item) => item !== time))}
                >
                  <Text style={styles.chipText}>{time} ✕</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setPendingTime(new Date());
              setShowTimePicker(true);
            }}
          >
            <Text style={styles.secondaryButtonText}>Add time</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {recurrenceType === 'weekly' ? (
        <>
          <Text style={styles.label}>Weekdays</Text>
          <View style={styles.weekdayRow}>
            {weekdays.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.weekdayButton,
                  weekdaysSelected.includes(day.key) && styles.weekdayButtonActive,
                ]}
                onPress={() => toggleWeekday(day.key)}
              >
                <Text
                  style={[
                    styles.weekdayText,
                    weekdaysSelected.includes(day.key) && styles.weekdayTextActive,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {recurrenceType === 'interval' ? (
        <>
          <Text style={styles.label}>Interval hours</Text>
          <TextInput
            style={styles.input}
            placeholder="Every X hours"
            value={intervalHours}
            onChangeText={setIntervalHours}
            keyboardType="number-pad"
          />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryButtonText}>Save schedule</Text>
        )}
      </TouchableOpacity>

      {showTimePicker ? (
        <View style={styles.pickerCard}>
          <DateTimePicker
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={pendingTime}
            onChange={handleTimeChange}
          />
          {Platform.OS === 'ios' ? (
            <View style={styles.pickerActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={confirmTime}>
                <Text style={styles.primaryButtonText}>Add time</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#6a6660',
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  toggleButtonActive: {
    backgroundColor: '#1b1b1b',
  },
  toggleText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#1b1b1b',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    color: '#7d7a75',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b1b1b',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weekdayButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  weekdayButtonActive: {
    backgroundColor: '#1b1b1b',
  },
  weekdayText: {
    color: '#1b1b1b',
    fontSize: 12,
    fontWeight: '600',
  },
  weekdayTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
