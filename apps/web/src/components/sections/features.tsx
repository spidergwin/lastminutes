"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { featuresContent } from "@/data/features";
import * as Icons from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 py-1 px-4 text-xs font-semibold uppercase tracking-widest border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"
          >
            {featuresContent.badge}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-display)]">
            {featuresContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {featuresContent.description}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {featuresContent.items.map((item, i) => {
            const Icon = (Icons as Record<string, any>)[item.icon] || Icons.HelpCircle;
            return (
              <motion.div
                key={item.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className={`group relative rounded-2xl border bg-card p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/20 ${item.span}`}
              >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${item.accent} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 font-[family-name:var(--font-display)]">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
