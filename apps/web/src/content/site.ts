export const siteConfig = {
  name: "Last Minutes",
  description: "Professional-grade speech-to-text with specialized support for Nigerian languages. Translate, edit, and organize your ideas in real-time.",
  nav: [
    { name: "Features", href: "#features" },
    { name: "Languages", href: "#languages" },
    { name: "Pricing", href: "#pricing" },
  ],
  hero: {
    badge: "Next Generation Transcription",
    title: {
      main: "Capture Every",
      highlight: "Spoken Word",
    },
    description: "Professional-grade speech-to-text with specialized support for Nigerian languages. Translate, edit, and organize your ideas in real-time.",
    cta: {
      primary: { text: "Start Dictating Now", href: "/app" },
      secondary: { text: "See Features", href: "#features" },
    },
  },
  features: {
    title: "Everything you need",
    description: "Built for professionals who need accuracy, speed, and versatility in their transcription workflow.",
    items: [
      {
        title: "Live Dictation",
        description: "Speak directly into your browser with real-time speech-to-text transcription.",
        icon: "Mic",
        className: "md:col-span-2",
        color: "blue",
      },
      {
        title: "File Transcription",
        description: "Upload audio and video files for professional transcription.",
        icon: "FileUp",
        className: "md:col-span-1",
        color: "purple",
      },
      {
        title: "Real-Time Translation",
        description: "Instantly translate transcripts into multiple languages.",
        icon: "Languages",
        className: "md:col-span-1",
        color: "green",
      },
      {
        title: "Nigerian Languages",
        description: "Full support for Hausa, Yoruba, Igbo, and Nigerian Pidgin.",
        icon: "Globe",
        className: "md:col-span-2",
        color: "amber",
      },
    ],
  },
  benefits: [
    {
      title: "Secure & Private",
      description: "Your data is encrypted and handled with the highest security standards. We respect your privacy.",
      icon: "Shield",
      color: "blue",
    },
    {
      title: "Detailed Analytics",
      description: "Track your word count, speaking speed, and productivity over time with our built-in dashboard.",
      icon: "BarChart3",
      color: "purple",
    },
    {
      title: "Instant Export",
      description: "Export your transcripts in various formats including PDF, Word, and SRT for video captions.",
      icon: "Zap",
      color: "emerald",
    },
  ],
  languages: {
    title: "Global reach, local focus",
    items: [
      "English", "French", "Spanish", "German", "Portuguese", "Italian", "Chinese",
      "Hausa", "Yoruba", "Igbo", "Pidgin", "Swahili", "Arabic"
    ],
  },
  pricing: {
    title: "Simple, transparent pricing",
    description: "Choose the plan that's right for you. No hidden fees.",
    plans: [
      {
        name: "Free Trial",
        price: "0",
        period: "/7 days",
        description: "Try Last Minutes free for 7 days.",
        features: [
          "15 minutes of transcription",
          "Live dictation",
          "English language only",
          "TXT export",
        ],
        cta: "Start Free Trial",
        href: "/signup",
        popular: false,
      },
      {
        name: "Pro",
        price: "5,000",
        period: "/mo",
        description: "For professionals who need power and accuracy.",
        features: [
          "Unlimited transcription",
          "Real-time translation",
          "All 18+ languages",
          "AI summaries & action items",
          "Priority support",
          "All export formats",
        ],
        cta: "Get Pro",
        href: "/signup?plan=pro",
        popular: true,
      },
      {
        name: "Business",
        price: "15,000",
        description: "For teams and organizations at scale.",
        period: "/mo",
        features: [
          "Everything in Pro",
          "Team collaboration",
          "Admin dashboard",
          "SSO & SAML",
          "Dedicated account manager",
          "SLA guarantees",
        ],
        cta: "Get Business",
        href: "/signup?plan=business",
        popular: false,
      },
    ],
  },
  cta: {
    title: "Ready to capture your thoughts?",
    description: "Join thousands of professionals using Last Minutes to streamline their transcription and translation workflow.",
    primaryText: "Get Started for Free",
    primaryHref: "/signup",
    subtext: "No credit card required for the free tier.",
  },
  footer: {
    description: "Empowering communication through advanced AI transcription and translation technologies.",
    sections: [
      {
        title: "Product",
        links: [
          { name: "Features", href: "#features" },
          { name: "Pricing", href: "#pricing" },
          { name: "Languages", href: "#languages" },
        ],
      },
      {
        title: "Company",
        links: [
          { name: "About Us", href: "/about" },
          { name: "Blog", href: "/blog" },
          { name: "Careers", href: "/careers" },
        ],
      },
      {
        title: "Legal",
        links: [
          { name: "Privacy Policy", href: "/privacy" },
          { name: "Terms of Service", href: "/terms" },
          { name: "Cookie Policy", href: "/cookies" },
        ],
      },
    ],
    copyright: "Last Minutes. All rights reserved.",
  },
  auth: {
    signin: {
      title: "Welcome Back",
      description: "Sign in to your Last Minutes account",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      buttonText: "Sign In",
      loadingText: "Signing in...",
      noAccountText: "Don't have an account?",
      signupLinkText: "Sign up",
    },
    signup: {
      title: "Create an Account",
      description: "Join Last Minutes today and start capturing your thoughts.",
      nameLabel: "Full Name",
      namePlaceholder: "John Doe",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      buttonText: "Create Account",
      loadingText: "Creating account...",
      haveAccountText: "Already have an account?",
      signinLinkText: "Sign in",
    },
  },
};

export type SiteConfig = typeof siteConfig;
