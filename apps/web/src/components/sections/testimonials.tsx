"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { testimonialsContent } from "@/data/testimonials";

export function Testimonials() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {testimonialsContent.badge}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold font-[family-name:var(--font-display)]">
            {testimonialsContent.title}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonialsContent.items.map((item, i) => {
            const initials = item.author
              .split(" ")
              .map((n) => n[0])
              .join("");

            return (
              <motion.div
                key={item.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-muted hover:border-amber-500/20 transition-colors duration-300">
                  <CardContent className="p-6 md:p-8 flex flex-col h-full">
                    <Quote className="w-8 h-8 text-amber-500/20 mb-4 shrink-0" />
                    <p className="text-foreground/90 leading-relaxed mb-6 flex-grow text-sm md:text-base">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{item.author}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.role} · {item.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
