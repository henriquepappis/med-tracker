import i18n, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import en from './resources/en.json';
import ptBR from './resources/pt-BR.json';
import es from './resources/es.json';
import fr from './resources/fr.json';

const STORAGE_KEY = 'med-tracker-language';

export const languageOptions = [
  { value: 'en', labelKey: 'settings.english' },
  { value: 'pt-BR', labelKey: 'settings.portuguese' },
  { value: 'es', labelKey: 'settings.spanish' },
  { value: 'fr', labelKey: 'settings.french' },
];

const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
  es: { translation: es },
  fr: { translation: fr },
};

const supportedLanguages = ['en', 'pt-BR', 'es', 'fr'];

function resolveDeviceLanguage() {
  const locale = Localization.getLocales()[0]?.languageTag;
  if (!locale) {
    return 'en';
  }
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('pt')) {
    return 'pt-BR';
  }
  if (normalized.startsWith('es')) {
    return 'es';
  }
  if (normalized.startsWith('fr')) {
    return 'fr';
  }
  return 'en';
}

export async function initI18n() {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  const storedLanguage = stored && supportedLanguages.includes(stored) ? stored : null;
  const initialLanguage = storedLanguage ?? resolveDeviceLanguage();

  if (!i18n.isInitialized) {
    const options: InitOptions = {
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      supportedLngs: supportedLanguages,
      compatibilityJSON: 'v4',
    };

    await i18n.use(initReactI18next).init(options);
  } else {
    await i18n.changeLanguage(initialLanguage);
  }

  return i18n;
}

export async function setLanguage(language: string) {
  await i18n.changeLanguage(language);
  await SecureStore.setItemAsync(STORAGE_KEY, language);
}

export async function getStoredLanguage() {
  return SecureStore.getItemAsync(STORAGE_KEY);
}

export default i18n;
