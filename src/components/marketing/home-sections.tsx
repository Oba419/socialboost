import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CalendarCheck,
  Clock,
  Compass,
  Layers,
  LineChart,
  MessageSquareQuote,
  Share2,
  ShieldCheck,
  UserPlus,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion/count-up";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { PLATFORM_LIST } from "@/config/platforms";
import { AI_FEATURES } from "./feature-data";
import { FeatureCard } from "./feature-card";
import { Section } from "./section";

/** Product facts (true by construction — no invented user metrics). */
export function FactsStrip() {
  const facts = [
    { value: PLATFORM_LIST.length, suffix: "", label: "Platforms supported" },
    { value: 13, suffix: "", label: "Purpose-built AI tools" },
    { value: 0, prefix: "₦", suffix: "", label: "To get started" },
    { value: 0, suffix: "", label: "Fake followers. Ever." },
  ];
  return (
    <section aria-label="Product facts" className="px-4 sm:px-6">
      <div className="gradient-border glass mx-auto grid max-w-6xl grid-cols-2 rounded-3xl md:grid-cols-4" data-reveal-stagger>
        {facts.map((f, i) => (
          <div key={f.label} className={`px-6 py-8 text-center ${i > 0 ? "md:border-l" : ""} ${i % 2 === 1 ? "border-l md:border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""}`}>
            <p className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">
              <CountUp to={f.value} prefix={f.prefix} suffix={f.suffix} />
            </p>
            <p className="text-muted-foreground mt-2 text-sm">{f.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AIFeaturesSection() {
  return (
    <Section
      id="ai-features"
      eyebrow="AI features"
      title={
        <>
          An AI assistant for <span className="text-gradient">every step</span> of content creation
        </>
      }
      description="Purpose-built tools — each with its own instructions and validated output — instead of one generic chatbot."
      revealChildren={false}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal-stagger>
        {AI_FEATURES.map((f) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </div>
      <div className="mt-12 text-center" data-reveal>
        <Button variant="glass" size="lg" asChild className="rounded-full">
          <Link href="/features">
            See all features <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}

const STEPS = [
  { icon: UserPlus, title: "Create your account", description: "Sign up free and tell us about your brand, niche, audience and goals." },
  { icon: Share2, title: "Connect or enter your accounts", description: "Connect supported platforms via official OAuth, or enter your current numbers manually." },
  { icon: Wand2, title: "Get your growth plan", description: "Receive an initial assessment and a personalised plan — clearly marked as hypotheses until you have data." },
  { icon: CalendarCheck, title: "Create, schedule and measure", description: "Generate content, plan your calendar, publish where supported and learn from your results." },
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" eyebrow="How it works" title="From blank page to a consistent plan" revealChildren={false}>
      <div className="relative">
        {/* Connecting gradient line (desktop) */}
        <div
          aria-hidden
          data-reveal="fade"
          className="absolute top-7 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-[var(--brand-purple)] via-[var(--brand-blue)] to-[var(--brand-pink)] opacity-50 lg:block"
        />
        <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-reveal-stagger>
          {STEPS.map((s, i) => (
            <li key={s.title} className="text-center">
              <span className="bg-brand-gradient-animated relative mx-auto mb-6 inline-flex size-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/30 ring-8 ring-[var(--background)]">
                <s.icon className="size-6" />
                <span className="bg-background text-foreground absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums">
                  {i + 1}
                </span>
              </span>
              <h3 className="font-semibold tracking-tight">{s.title}</h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed">{s.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

const BENEFITS = [
  { icon: Clock, title: "Save hours every week", description: "Draft captions, scripts and plans in minutes, then spend your time on what only you can do.", wide: true, tint: "var(--brand-purple)" },
  { icon: Layers, title: "One place for every platform", description: "Plan, create and organise content for all your channels from a single workspace.", tint: "var(--brand-blue)" },
  { icon: Compass, title: "Clear direction", description: "Personalised plans and coaching turn vague goals into specific daily actions.", tint: "var(--brand-cyan)" },
  { icon: LineChart, title: "Decisions backed by real data", description: "Analytics show where each number came from — live API, manual entry or import.", wide: true, tint: "var(--brand-pink)" },
  { icon: ShieldCheck, title: "Secure by design", description: "OAuth connections, encrypted tokens and no password collection. Disconnect anytime.", tint: "var(--brand-blue)" },
  { icon: Ban, title: "Organic growth only", description: "No fake followers, bots or engagement manipulation — just sustainable audience building.", tint: "var(--brand-purple)" },
];

export function BenefitsSection() {
  return (
    <Section
      id="benefits"
      eyebrow="Why choose us"
      title={
        <>
          Grow sustainably, with <span className="text-gradient">honest expectations</span>
        </>
      }
      description="We don't promise overnight virality. We help you show up consistently with better content and learn from real results."
      revealChildren={false}
    >
      <div className="grid auto-rows-fr gap-4 md:grid-cols-3" data-reveal-stagger>
        {BENEFITS.map((b) => (
          <SpotlightCard key={b.title} className={`bg-card/70 overflow-hidden rounded-3xl border p-7 backdrop-blur-sm ${b.wide ? "md:col-span-2" : ""}`}>
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full opacity-20 blur-3xl"
              style={{ background: b.tint }}
            />
            <span
              className="relative inline-flex size-11 items-center justify-center rounded-xl"
              style={{ background: `color-mix(in oklch, ${b.tint} 14%, transparent)`, color: b.tint }}
            >
              <b.icon className="size-5" />
            </span>
            <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{b.title}</h3>
            <p className="text-muted-foreground relative mt-2 max-w-md text-sm leading-relaxed">{b.description}</p>
          </SpotlightCard>
        ))}
      </div>
    </Section>
  );
}

export function TestimonialsSection() {
  return (
    <Section
      id="testimonials"
      eyebrow="Customer stories"
      title="Real stories, when they're real"
      description="We only publish testimonials from actual customers, with their permission. None are shown yet."
      revealChildren={false}
    >
      <div className="grid gap-4 md:grid-cols-3" data-reveal-stagger>
        {[0, 1, 2].map((i) => (
          <figure key={i} className="bg-card/50 flex flex-col rounded-3xl border border-dashed p-7 backdrop-blur-sm">
            <MessageSquareQuote className="text-primary/50 size-7" aria-hidden />
            <blockquote className="text-muted-foreground mt-4 flex-1 text-sm italic">
              Your story could be here — testimonials will appear once real customers share their experience.
            </blockquote>
            <figcaption className="text-muted-foreground mt-6 text-xs font-medium tracking-wide uppercase">
              Placeholder · not a real testimonial
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export function FinalCTASection() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 py-20 sm:px-6 sm:py-28">
      <div
        data-reveal="scale"
        className="noise relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[oklch(0.2_0.06_285)] px-6 py-16 text-center text-white shadow-2xl shadow-primary/25 sm:px-12 sm:py-20"
      >
        <div className="aurora opacity-90" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <h2 id="cta-heading" className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Ready to build a presence that lasts?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/80 sm:text-lg">
            Start free today. Upgrade only when you need more AI credits, scheduling or analytics.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="xl" asChild className="sheen rounded-full bg-white text-[oklch(0.25_0.08_285)] shadow-xl hover:-translate-y-0.5 hover:bg-white">
              <Link href="/signup">
                Start Growing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="xl" variant="ghost" asChild className="rounded-full border border-white/25 text-white hover:bg-white/10 hover:text-white">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
