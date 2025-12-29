import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  isOffline: boolean;
  lastUpdated?: string | null;
};

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
};

export default function OfflineBanner({ isOffline, lastUpdated }: Props) {
  const { t } = useTranslation();

  if (!isOffline) {
    return null;
  }

  const formatted = formatTimestamp(lastUpdated) ?? t('common.notAvailable');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('offline.title')}</Text>
      <Text style={styles.subtitle}>{t('offline.lastUpdated', { time: formatted })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0d58c',
  },
  title: {
    fontWeight: '600',
    color: '#6a4d00',
  },
  subtitle: {
    marginTop: 4,
    color: '#7d6a2f',
    fontSize: 12,
  },
});
