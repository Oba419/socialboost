import Link from "next/link";
import { ArrowRight, Ban, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { DashboardPreview } from "./dashboard-preview";

const HEADLINE = ["Your", "Social", "Media", "Growth"];

const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as React.CSSProperties;

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-24 sm:px-6 sm:pt-20 lg:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <p
            data-reveal="scale"
            className="glass mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklch,var(--brand-purple)_30%,transparent)] py-1 pr-3 pl-1 text-xs font-medium shadow-sm"
          >
            <span className="bg-brand-gradient-animated inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
              <Sparkles className="size-3" /> New
            </span>
            AI growth assistant for creators, brands and agencies
          </p>

          <h1 id="hero-heading" className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-7xl lg:text-[5.25rem]">
            {HEADLINE.map((word, i) => (
              <span key={word}>
                <span data-reveal className="inline-block" style={delay(80 + i * 90)}>
                  {word}
                </span>{" "}
              </span>
            ))}
            <br className="hidden sm:block" />
            <span data-reveal className="text-gradient-animated inline-block pb-2" style={delay(480)}>
              Starts Here.
            </span>
          </h1>

          <p data-reveal style={delay(620)} className="text-muted-foreground mx-auto mt-7 max-w-2xl text-lg text-pretty sm:text-xl">
            {siteConfig.description}
          </p>

          <div data-reveal style={delay(760)} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="xl" variant="gradient" asChild className="w-full rounded-full sm:w-auto">
              <Link href="/signup">
                Start Growing <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button size="xl" variant="glass" asChild className="w-full rounded-full sm:w-auto">
              <Link href="/features">Explore Features</Link>
            </Button>
          </div>

          <ul data-reveal style={delay(880)} className="text-muted-foreground mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck className="text-success size-4" /> Free plan, no card required</li>
            <li className="inline-flex items-center gap-1.5"><Sparkles className="text-primary size-4" /> 13 purpose-built AI tools</li>
            <li className="inline-flex items-center gap-1.5"><Ban className="text-brand-pink size-4" /> Organic growth only</li>
          </ul>
        </div>

        <div data-reveal="scale" style={delay(900)} className="mt-16 sm:mt-24">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
