export const featuresContent = {
  badge: "Capabilities",
  title: "Your conversations, perfectly understood",
  description:
    "From live dictation to batch file processing — capture, transcribe, and transform every spoken word into searchable, shareable intelligence.",
  items: [
    {
      title: "Real-Time Streaming",
      description:
        "Speak and see words appear instantly. Ultra-low latency streaming transcription that keeps up with the pace of real conversation.",
      icon: "Mic" as const,
      accent: "from-indigo-500 to-violet-500",
      span: "md:col-span-2",
    },
    {
      title: "File Transcription",
      description:
        "Upload audio or video files and get professional transcripts with speaker identification and precise timestamps.",
      icon: "FileAudio" as const,
      accent: "from-violet-500 to-purple-500",
      span: "md:col-span-1",
    },
    {
      title: "AI Summarization",
      description:
        "Generate executive summaries, action items, and meeting notes from any transcript with one click.",
      icon: "Sparkles" as const,
      accent: "from-amber-500 to-orange-500",
      span: "md:col-span-1",
    },
    {
      title: "Nigerian Language Support",
      description:
        "(Coming Soon) Deep support for Hausa, Yoruba, Igbo, Pidgin, Edo, Efik, Tiv, and Fulfulde — plus 10+ international languages. AI that respects every voice and accent.",
      icon: "Globe" as const,
      accent: "from-emerald-500 to-teal-500",
      span: "md:col-span-2",
    },
  ],
};

export const benefitsContent = {
  title: "For creators, researchers, and anyone who speaks",
  items: [
    {
      step: "01",
      title: "Secure & Private",
      description:
        "All data encrypted in transit and at rest. Your transcripts stay private — we never use your data to train models.",
      icon: "Shield" as const,
    },
    {
      step: "02",
      title: "Multi-Format Export",
      description:
        "Download your transcripts as TXT, DOCX, PDF, SRT, VTT, or JSON — ready for any workflow.",
      icon: "Download" as const,
    },
    {
      step: "03",
      title: "Smart Translation",
      description:
        "Translate transcripts across 18+ languages with contextual accuracy that preserves meaning, not just words.",
      icon: "Languages" as const,
    },
  ],
};
