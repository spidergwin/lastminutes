"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/data/site";

export function CTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-purple-700" />
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center px-4 relative z-10"
      >
        <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-6">
          You speak. We listen. We understand.
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white font-[family-name:var(--font-display)]">
          Never miss what matters in conversation
        </h2>
        <p className="text-lg md:text-xl mb-10 text-white/80 max-w-2xl mx-auto">
          Join professionals using {siteConfig.name} to capture, understand, and transform every spoken word into actionable intelligence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-bold bg-white text-indigo-700 hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-base font-bold border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
            >
              Talk to Sales
            </Button>
          </Link>
        </div>
        <p className="mt-8 text-white/50 text-sm">
          No credit card required. Start with 15 free minutes.
        </p>
      </motion.div>
    </section>
  );
}
