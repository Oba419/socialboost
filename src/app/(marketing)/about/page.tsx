import { Compass, Heart, ShieldCheck, Sprout } from "lucide-react";
import { FinalCTASection } from "@/components/marketing/home-sections";
import { Section } from "@/components/marketing/section";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "About",
  description: `The vision and mission behind ${siteConfig.name}.`,
};

const VALUES = [
  { icon: Sprout, title: "Sustainable growth", description: "We favour consistency, quality and genuine relationships over shortcuts that put accounts at risk." },
  { icon: ShieldCheck, title: "Honesty with data", description: "Every metric shows where it came from. We never present sample or estimated numbers as real performance." },
  { icon: Heart, title: "Creators first", description: "AI should remove busywork and blank-page anxiety — your voice and judgement stay in charge." },
  { icon: Compass, title: "Respect for platforms", description: "Official APIs, OAuth and platform rules only. No scraping, bots or engagement manipulation." },
];

export default function AboutPage() {
  return (
    <>
      <div className="bg-hero-glow">
        <Section
          as="h1"
          eyebrow="About us"
          title="Helping every creator and business grow with confidence"
          description={`${siteConfig.name} brings planning, AI-assisted content creation, coaching and analytics into one place, so you can spend less time guessing and more time creating.`}
        />
      </div>

      <Section id="mission" eyebrow="Our mission" title="Make professional-grade social strategy accessible" centered={false}>
        <div className="text-muted-foreground grid gap-8 leading-relaxed md:grid-cols-2">
          <p>
            Growing on social media can feel like a full-time job: deciding what to post, writing it, keeping up with
            every platform and trying to understand what the numbers mean. Agencies and big brands have teams for this.
            Most creators, entrepreneurs and small businesses don&apos;t.
          </p>
          <p>
            Our mission is to give everyone a capable growth assistant — one that understands your brand, suggests
            practical next steps and helps you create content that fits each platform, while being transparent about
            what AI can and can&apos;t know.
          </p>
        </div>
      </Section>

      <Section id="values" eyebrow="What we believe" title="Principles we build by" className="bg-muted/30">
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-card flex gap-4 rounded-2xl border p-6">
              <span className="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-lg">
                <v.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <FinalCTASection />
    </>
  );
}
