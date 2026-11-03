export const SUPPORTED_LANGUAGES: Record<string, { name: string; nativeName: string }> = {
  en: { name: "English", nativeName: "English" },
  fr: { name: "French", nativeName: "Français" },
  es: { name: "Spanish", nativeName: "Español" },
  de: { name: "German", nativeName: "Deutsch" },
  pt: { name: "Portuguese", nativeName: "Português" },
  it: { name: "Italian", nativeName: "Italiano" },
  zh: { name: "Chinese", nativeName: "中文" },
  ja: { name: "Japanese", nativeName: "日本語" },
  ko: { name: "Korean", nativeName: "한국어" },
  ar: { name: "Arabic", nativeName: "العربية" },
  ha: { name: "Hausa (Coming Soon)", nativeName: "Hausa" },
  yo: { name: "Yoruba (Coming Soon)", nativeName: "Yorùbá" },
  ig: { name: "Igbo (Coming Soon)", nativeName: "Igbo" },
  pid: { name: "Nigerian Pidgin (Coming Soon)", nativeName: "Naija Pidgin" },
  multi: { name: "Multi-language (Code-switching - Coming Soon)", nativeName: "Auto (Eng/Pidgin/Igbo)" },
};

export const getLanguageName = (code: string) => SUPPORTED_LANGUAGES[code]?.name || code;
