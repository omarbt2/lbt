import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  textSize: 'small' | 'medium' | 'large' | 'xlarge';
  setTextSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const TEXT_SIZE_MAP = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
};

const RTL_LOCALES: Locale[] = ['ar'];

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('lbt_locale');
    return (saved as Locale) || 'en';
  });

  const [textSize, setTextSizeState] = useState<'small' | 'medium' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('lbt_text_size');
    return (saved as any) || 'medium';
  });

  const isRTL = RTL_LOCALES.includes(locale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('lbt_locale', newLocale);
    document.documentElement.dir = RTL_LOCALES.includes(newLocale) ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  }, []);

  const setTextSize = useCallback((size: 'small' | 'medium' | 'large' | 'xlarge') => {
    setTextSizeState(size);
    localStorage.setItem('lbt_text_size', size);
    document.documentElement.style.fontSize = TEXT_SIZE_MAP[size];
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const localeTranslations = translations[locale];
    if (localeTranslations && key in localeTranslations) {
      return (localeTranslations as Record<string, string>)[key] || translations.en[key] || key;
    }
    return translations.en[key] || key;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.style.fontSize = TEXT_SIZE_MAP[textSize];
  }, [locale, isRTL, textSize]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL, textSize, setTextSize }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export { I18nContext };
