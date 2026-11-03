"use client";

import { motion } from "framer-motion";
import { benefitsContent } from "@/data/features";
import * as Icons from "lucide-react";

export function Benefits() {
  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-display)]">
            {benefitsContent.title}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {benefitsContent.items.map((item, i) => {
            const Icon = (Icons as Record<string, any>)[item.icon] || Icons.HelpCircle;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative pl-8 md:pl-0"
              >
                {/* Step number */}
                <div className="text-6xl font-bold font-[family-name:var(--font-display)] text-muted/80 dark:text-muted/50 mb-4 leading-none">
                  {item.step}
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-xl font-bold mb-2 font-[family-name:var(--font-display)]">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
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
