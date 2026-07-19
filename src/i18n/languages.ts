// spell:disable
export const supportedLanguages = {
  en: "English",
  // es: "Español",
  // pt: "Português",
  // fr: "Français",
  // ar: "العربية",
  // zh: "简体中文",
  // hi: "हिन्दी",
  // ru: "русский",
  // tr: "Türkçe",
  // ko: "한국어",
  // ja: "日本語",
};

export type SupportedLocale = keyof typeof supportedLanguages;

export const supportedLocales = Object.keys(
  supportedLanguages,
) as SupportedLocale[];

export const languageToCountryCode: Record<SupportedLocale, string> = {
  en: "GB",
  // es: "ES",
  // pt: "PT",
  // fr: "FR",
  // ar: "SA",
  // zh: "CN",
  // hi: "IN",
  // ru: "RU",
  // tr: "TR",
  // ko: "KR",
  // ja: "JP",
};

export const defaultLocale = "en";
