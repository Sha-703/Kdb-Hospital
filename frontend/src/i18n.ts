import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal i18n initialization to silence react-i18next warnings.
// Add translations/resources as needed.
i18n.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  resources: {},
  interpolation: { escapeValue: false },
});

export default i18n;
