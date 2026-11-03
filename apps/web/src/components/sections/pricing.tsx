"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { pricingContent } from "@/data/pricing";

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 md:py-32 bg-muted/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
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
            {pricingContent.badge}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-display)]">
            {pricingContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            {pricingContent.description}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-card border rounded-full p-1 text-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                !annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-emerald-500 font-bold">-20%</span>
            </button>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
          {pricingContent.plans.map((plan, i) => {
            const price = annual ? plan.price.annual : plan.price.monthly;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={isPopular ? "md:-mt-4 md:mb-4" : ""}
              >
                <Card
                  className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
                    isPopular
                      ? "glow-border shadow-2xl shadow-amber-500/10 border-transparent"
                      : "hover:shadow-lg hover:border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)]">
                      {plan.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="flex-grow space-y-6">
                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      {price === "0" ? (
                        <span className="text-4xl font-bold font-[family-name:var(--font-display)]">Free</span>
                      ) : (
                        <>
                          <span className="text-lg font-semibold text-muted-foreground">{plan.currency}</span>
                          <span className="text-4xl font-bold font-[family-name:var(--font-display)]">{price}</span>
                          <span className="text-muted-foreground text-sm">{plan.period}</span>
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.limitations.map((limitation) => (
                        <li key={limitation} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Link href={plan.href} className="w-full">
                      <Button
                        className={`w-full h-12 font-semibold ${
                          isPopular
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 border-0"
                            : ""
                        }`}
                        variant={isPopular ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
