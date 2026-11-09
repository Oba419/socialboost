import { FAQ } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import {
  AIFeaturesSection,
  BenefitsSection,
  FactsStrip,
  FinalCTASection,
  HowItWorksSection,
  TestimonialsSection,
} from "@/components/marketing/home-sections";
import { PlatformStrip } from "@/components/marketing/platform-strip";
import { PricingTable } from "@/components/marketing/pricing-table";
import { GradientDivider, Section } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <FactsStrip />
      <PlatformStrip />
      <AIFeaturesSection />
      <GradientDivider />
      <HowItWorksSection />
      <BenefitsSection />
      <div className="relative">
        <div aria-hidden className="bg-hero-glow pointer-events-none absolute inset-0 opacity-70" />
        <Section
          id="pricing"
          eyebrow="Pricing"
          title={
            <>
              Simple plans that <span className="text-gradient">grow with you</span>
            </>
          }
          description="Start free. Upgrade when you need more AI credits, scheduling, analytics or team features."
          revealChildren={false}
        >
          <PricingTable compact />
        </Section>
      </div>
      <TestimonialsSection />
      <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
        <FAQ />
      </Section>
      <FinalCTASection />
    </>
  );
}
