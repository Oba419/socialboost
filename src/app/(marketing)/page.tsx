import { FAQ } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import {
  AIFeaturesSection,
  BenefitsSection,
  FinalCTASection,
  HowItWorksSection,
  TestimonialsSection,
} from "@/components/marketing/home-sections";
import { PlatformStrip } from "@/components/marketing/platform-strip";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <PlatformStrip />
      <AIFeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <Section
        id="pricing"
        eyebrow="Pricing"
        title="Simple plans that grow with you"
        description="Start free. Upgrade when you need more AI credits, scheduling, analytics or team features."
        className="bg-muted/30"
      >
        <PricingTable compact />
      </Section>
      <TestimonialsSection />
      <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
        <FAQ />
      </Section>
      <FinalCTASection />
    </>
  );
}
