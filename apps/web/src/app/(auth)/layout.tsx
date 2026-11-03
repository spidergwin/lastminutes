import { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import Logo from "@/components/logo";
import { authContent } from "@/data/auth";
import { siteConfig } from "@/data/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-amber-600 via-orange-600 to-purple-700 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative z-10">
          <Logo />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
            {authContent.brand.tagline}
          </p>
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight font-[family-name:var(--font-display)]">
            {authContent.brand.headline}
          </h1>
          <ul className="space-y-3 mt-8">
            {authContent.brand.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/80">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
