"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqContent } from "@/data/faq";

export function FAQ() {
  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <Badge
            variant="secondary"
            className="mb-4 py-1 px-4 text-xs font-semibold uppercase tracking-widest border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full"
          >
            {faqContent.badge}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-display)]">
            {faqContent.title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {faqContent.description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqContent.items.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border rounded-xl px-6 bg-card hover:border-amber-500/20 transition-colors data-[state=open]:border-amber-500/30 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold py-5 text-[15px] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
