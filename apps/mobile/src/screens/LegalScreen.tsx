import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

export default function LegalScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('legal.title') });
  }, [navigation, t]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('legal.title')}</Text>
      <Text style={styles.updated}>{t('legal.lastUpdated')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('legal.privacyTitle')}</Text>
        <Text style={styles.body}>{t('legal.privacyBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('legal.termsTitle')}</Text>
        <Text style={styles.body}>{t('legal.termsBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('legal.disclaimerTitle')}</Text>
        <Text style={styles.body}>{t('legal.disclaimerBody')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f5f2',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  updated: {
    marginTop: 4,
    color: '#6a6660',
    fontSize: 12,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    marginTop: 8,
    color: '#4a4742',
    lineHeight: 20,
  },
});
