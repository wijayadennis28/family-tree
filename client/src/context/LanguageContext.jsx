import React, { createContext, useState, useCallback, useContext } from 'react';
import en from '../locales/en.json';
import id from '../locales/id.json';

const translations = { en, id };

export const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(template, variables) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables && variables[key] !== undefined ? variables[key] : ''
  );
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('ft_language') || 'en';
    } catch (_) {
      return 'en';
    }
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('ft_language', lang);
    } catch (_) {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key, fallbackOrVariables, maybeVariables) => {
      let fallback;
      let variables;
      if (typeof fallbackOrVariables === 'object' && fallbackOrVariables !== null) {
        variables = fallbackOrVariables;
      } else {
        fallback = fallbackOrVariables;
        variables = maybeVariables;
      }
      const value = getNestedValue(translations[language], key);
      if (value !== undefined) return interpolate(value, variables);
      if (fallback !== undefined) return interpolate(fallback, variables);
      return key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
