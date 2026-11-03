"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { languagesContent } from "@/data/languages";

export function Languages() {
  const nigerian = languagesContent.items.filter((l) => l.category === "nigerian");
  const international = languagesContent.items.filter((l) => l.category === "international");

  return (
    <section id="languages" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/3 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 py-1 px-4 text-xs font-semibold uppercase tracking-widest border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"
          >
            {languagesContent.badge}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-display)]">
            {languagesContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {languagesContent.description}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Nigerian Languages — highlighted */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-emerald-500 rounded-full" />
              {languagesContent.nigerianLabel}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {nigerian.map((lang, i) => (
                <motion.div
                  key={lang.code}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative group flex items-center gap-3 p-3 rounded-xl border bg-card transition-all duration-200 cursor-default overflow-hidden ${
                    lang.comingSoon 
                      ? 'border-border/40 opacity-70 grayscale-[30%] hover:grayscale-0' 
                      : 'hover:border-emerald-500/30 hover:bg-emerald-500/5'
                  }`}
                >
                  {lang.comingSoon && (
                    <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                      Coming Soon
                    </div>
                  )}
                  <span className={`text-xl ${lang.comingSoon ? 'opacity-80' : ''}`}>{lang.flag}</span>
                  <div>
                    <div className={`font-semibold text-sm ${lang.comingSoon ? 'text-muted-foreground' : ''}`}>{lang.name}</div>
                    <div className="text-xs text-muted-foreground/70">{lang.nativeName}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* International Languages */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-6 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-amber-500 rounded-full" />
              {languagesContent.internationalLabel}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {international.map((lang, i) => (
                <motion.div
                  key={lang.code}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200 cursor-default"
                >
                  <span className="text-xl">{lang.flag}</span>
                  <div>
                    <div className="font-semibold text-sm">{lang.name}</div>
                    <div className="text-xs text-muted-foreground">{lang.nativeName}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
