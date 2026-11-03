export const siteConfig = {
  name: "Last Minutes",
  tagline: "You speak. We listen. We understand.",
  description:
    "The intelligent voice platform for professionals who demand precision. Capture, understand, and transform conversations across 50+ languages — with first-class support for Nigerian languages.",
  url: "https://lastminutes.app",
  ogImage: "/og.png",
  creator: "Last Minutes Team",
  keywords: [
    "voice platform",
    "transcription",
    "speech intelligence",
    "Nigerian languages",
    "Hausa",
    "Yoruba",
    "Igbo",
    "Pidgin English",
    "meeting notes",
    "AI summarization",
    "multilingual transcription",
    "conversation intelligence",
  ],
  social: {
    twitter: "https://twitter.com/lastminutesapp",
    linkedin: "https://linkedin.com/company/lastminutes",
  },
} as const;

export type SiteConfig = typeof siteConfig;
