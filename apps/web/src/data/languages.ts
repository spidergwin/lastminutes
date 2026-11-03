export interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  category: "nigerian" | "international";
  comingSoon?: boolean;
}

export const languagesContent = {
  badge: "Languages",
  title: "Global reach, local depth",
  description:
    "Deep support for Nigerian languages you won't find anywhere else, plus all the international languages your team needs.",
  nigerianLabel: "Nigerian Languages",
  internationalLabel: "International Languages",
  items: [
    // Nigerian Languages
    { code: "ha", name: "Hausa", nativeName: "Hausa", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "yo", name: "Yoruba", nativeName: "Yorùbá", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "ig", name: "Igbo", nativeName: "Igbo", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "pid", name: "Nigerian Pidgin", nativeName: "Naija Pidgin", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "bin", name: "Edo", nativeName: "Ẹ̀dó", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "efi", name: "Efik", nativeName: "Efik", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "tiv", name: "Tiv", nativeName: "Tiv", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    { code: "ff", name: "Fula", nativeName: "Fulfulde", flag: "🇳🇬", category: "nigerian" as const, comingSoon: true },
    // International Languages
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", category: "international" as const },
    { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", category: "international" as const },
    { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", category: "international" as const },
    { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", category: "international" as const },
    { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", category: "international" as const },
    { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", category: "international" as const },
    { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", category: "international" as const },
    { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", category: "international" as const },
    { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", category: "international" as const },
    { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", category: "international" as const },
  ] satisfies LanguageItem[],
};
