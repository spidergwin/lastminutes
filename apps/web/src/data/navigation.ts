export const mainNav = [
  { name: "Features", href: "/#features" },
  { name: "Languages", href: "/#languages" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Download App", href: "/download" },
  { name: "FAQ", href: "/#faq" },
] as const;

export const footerSections = [
  {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "API Docs", href: "/docs/api" },
      { name: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
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
] as const;

export const sidebarNav = [
  { title: "Dashboard", url: "/dashboard", icon: "Home" as const },
  { title: "New Dictation", url: "/app", icon: "Mic" as const },
  { title: "My Transcripts", url: "/dashboard", icon: "FileText" as const },
  { title: "History", url: "/dashboard", icon: "History" as const },
  { title: "Translation", url: "/app", icon: "Languages" as const },
] as const;
