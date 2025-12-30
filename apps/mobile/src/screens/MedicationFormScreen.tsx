import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import Toast from '../components/Toast';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'MedicationForm'>;

export default function MedicationFormScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const editing = route.params?.medication;
  const [name, setName] = useState(editing?.name ?? '');
  const [dosage, setDosage] = useState(editing?.dosage ?? '');
  const [instructions, setInstructions] = useState(editing?.instructions ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editing ? t('navigation.editMedication') : t('navigation.newMedication'),
    });
  }, [editing, navigation, t]);

  const handleSubmit = async () => {
    if (!token) {
      return;
    }
    if (isOffline) {
      Alert.alert(t('offline.readOnlyTitle'), t('offline.readOnlyMessage'));
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
      setToast(t('success.saved'));
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveMedication'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <OfflineBanner isOffline={isOffline} />
      <TextInput
        style={styles.input}
        placeholder={t('medications.namePlaceholder')}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder={t('medications.dosagePlaceholder')}
        value={dosage}
        onChangeText={setDosage}
      />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder={t('medications.instructionsPlaceholder')}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, (loading || isOffline) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading || isOffline}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
      </TouchableOpacity>
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
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
  buttonDisabled: {
    opacity: 0.6,
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
