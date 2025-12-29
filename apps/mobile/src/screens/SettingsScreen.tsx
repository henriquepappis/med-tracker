import { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import i18n, { languageOptions, setLanguage } from '../i18n';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.title') });
  }, [navigation, t]);

  const handleChangeLanguage = async (value: string) => {
    await setLanguage(value);
    setCurrentLanguage(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language')}</Text>
      <Text style={styles.subtitle}>{t('settings.languageHelp')}</Text>
      <View style={styles.list}>
        {languageOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, currentLanguage === option.value && styles.optionActive]}
            onPress={() => handleChangeLanguage(option.value)}
          >
            <Text
              style={[styles.optionText, currentLanguage === option.value && styles.optionTextActive]}
            >
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5f2',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    color: '#6a6660',
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  option: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d9d4cd',
  },
  optionActive: {
    borderColor: '#1b1b1b',
  },
  optionText: {
    color: '#1b1b1b',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#1b1b1b',
  },
});
