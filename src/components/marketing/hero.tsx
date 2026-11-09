import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { DashboardPreview } from "./dashboard-preview";

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="bg-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="bg-background/60 text-muted-foreground mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur">
            <span className="bg-brand-gradient size-1.5 rounded-full" aria-hidden />
            AI growth assistant for creators, brands and agencies
          </p>
          <h1 id="hero-heading" className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Your Social Media Growth <span className="text-gradient">Starts Here.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">{siteConfig.description}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Start Growing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-background/60 w-full sm:w-auto">
              <Link href="/features">Explore Features</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-5 inline-flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" /> Free plan available · No card required · Organic growth only
          </p>
        </div>
        <div className="mt-16 sm:mt-20">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
