import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Clock,
  Compass,
  Layers,
  LineChart,
  MessageSquareQuote,
  ShieldCheck,
  UserPlus,
  Wand2,
  Share2,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_FEATURES } from "./feature-data";
import { FeatureCard } from "./feature-card";
import { Section } from "./section";

export function AIFeaturesSection() {
  return (
    <Section
      id="ai-features"
      eyebrow="AI features"
      title="An AI assistant built for every step of content creation"
      description="Purpose-built tools — each with its own instructions and validated output — instead of one generic chatbot."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AI_FEATURES.map((f) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button variant="outline" asChild>
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
    <Section id="how-it-works" eyebrow="How it works" title="From blank page to a consistent plan" className="bg-muted/30">
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-card relative rounded-2xl border p-6">
            <span className="text-muted-foreground absolute top-5 right-5 text-xs font-medium tabular-nums">0{i + 1}</span>
            <span className="bg-brand-gradient mb-4 inline-flex size-11 items-center justify-center rounded-xl text-white">
              <s.icon className="size-5" />
            </span>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const BENEFITS = [
  { icon: Clock, title: "Save hours every week", description: "Draft captions, scripts and plans in minutes, then spend your time on what only you can do." },
  { icon: Layers, title: "One place for every platform", description: "Plan, create and organise content for all your channels from a single workspace." },
  { icon: Compass, title: "Clear direction", description: "Personalised plans and coaching turn vague goals into specific daily actions." },
  { icon: LineChart, title: "Decisions backed by real data", description: "Analytics show where each number came from — live API, manual entry or import." },
  { icon: ShieldCheck, title: "Secure by design", description: "OAuth connections, encrypted tokens and no password collection. Disconnect anytime." },
  { icon: Ban, title: "Organic growth only", description: "No fake followers, bots or engagement manipulation — just sustainable audience building." },
];

export function BenefitsSection() {
  return (
    <Section
      id="benefits"
      eyebrow="Why choose us"
      title="Grow sustainably, with honest expectations"
      description="We don't promise overnight virality. We help you show up consistently with better content and learn from real results."
    >
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex gap-4">
            <span className="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-lg">
              <b.icon className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{b.description}</p>
            </div>
          </div>
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
      className="bg-muted/30"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <figure key={i} className="bg-card/60 flex flex-col rounded-2xl border border-dashed p-6">
            <MessageSquareQuote className="text-muted-foreground/60 size-6" aria-hidden />
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
    <section aria-labelledby="cta-heading" className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="bg-brand-gradient relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white shadow-xl shadow-primary/20 sm:px-12">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative">
          <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to build a presence that lasts?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Start free today. Upgrade only when you need more AI credits, scheduling or analytics.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">
                Start Growing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-white hover:bg-white/15 hover:text-white">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
