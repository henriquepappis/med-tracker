import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';

type Medication = {
  id: number;
  name: string;
  dosage: string;
  instructions?: string | null;
};

type AppStackParamList = {
  Medications: undefined;
  MedicationForm: { medication?: Medication };
};

type Props = NativeStackScreenProps<AppStackParamList, 'MedicationForm'>;

export default function MedicationFormScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const editing = route.params?.medication;
  const [name, setName] = useState(editing?.name ?? '');
  const [dosage, setDosage] = useState(editing?.dosage ?? '');
  const [instructions, setInstructions] = useState(editing?.instructions ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editing ? 'Edit medication' : 'New medication',
    });
  }, [editing, navigation]);

  const handleSubmit = async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/medications/${editing.id}`, { name, dosage, instructions }, token);
      } else {
        await api.post('/medications', { name, dosage, instructions }, token);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Dosage"
        value={dosage}
        onChangeText={setDosage}
      />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Instructions (optional)"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f5f2',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
  },
});
