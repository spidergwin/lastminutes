"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { heroContent } from "@/data/hero";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function Hero() {
  return (
    <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <Badge
              variant="secondary"
              className="mb-6 py-1.5 px-5 text-xs sm:text-sm font-medium border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 animate-pulse" />
              {heroContent.badge}
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 font-[family-name:var(--font-display)] leading-[1.1] sm:leading-[1.05]"
          >
            {heroContent.title.line1}{" "}
            <span className="text-gradient">{heroContent.title.highlight}</span>
            <br />
            <span className="text-muted-foreground/70">{heroContent.title.line2}</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {heroContent.description}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href={heroContent.cta.primary.href}>
              <Button
                size="lg"
                className="h-13 px-8 text-base bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2 shadow-xl shadow-amber-500/25 border-0 w-full sm:w-auto"
              >
                {heroContent.cta.primary.text}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href={heroContent.cta.secondary.href}>
              <Button
                variant="outline"
                size="lg"
                className="h-13 px-8 text-base gap-2 w-full sm:w-auto"
              >
                <Play className="w-4 h-4" />
                {heroContent.cta.secondary.text}
              </Button>
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {heroContent.trustIndicators.map((text) => (
              <div key={text} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Animated waveform */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20 flex justify-center items-end gap-[3px] h-20 relative"
        >
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-gradient-to-t from-amber-500/60 to-orange-500/30 rounded-full animate-wave origin-bottom"
              style={{
                height: `${Math.sin(i * 0.3) * 40 + 50}%`,
                animationDelay: `${i * 0.04}s`,
                animationDuration: `${1 + Math.sin(i * 0.5) * 0.4}s`,
              }}
            />
          ))}
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {heroContent.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-display)] text-gradient">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
