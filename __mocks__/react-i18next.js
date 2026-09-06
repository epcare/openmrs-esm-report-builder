/**
 * Minimal react-i18next mock (the jest moduleNameMapper references this path).
 * `t` returns the fallback string when provided, else the key.
 */
module.exports = {
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en', changeLanguage: () => {} },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
};
