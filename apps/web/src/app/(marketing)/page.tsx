import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Benefits } from "@/components/sections/benefits";
import { Languages } from "@/components/sections/languages";
import { Pricing } from "@/components/sections/pricing";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { Download } from "@/components/sections/download";
import { CTA } from "@/components/sections/cta";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Benefits />
        <Languages />
        <Testimonials />
        <Download />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
