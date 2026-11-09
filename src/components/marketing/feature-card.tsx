import { SpotlightCard } from "@/components/motion/spotlight-card";
import type { MarketingFeature } from "./feature-data";

export function FeatureCard({ feature }: { feature: MarketingFeature }) {
  const Icon = feature.icon;
  return (
    <SpotlightCard className="group bg-card/70 h-full rounded-2xl border p-6 backdrop-blur-sm">
      <span className="bg-primary/10 text-primary group-hover:bg-brand-gradient-animated relative mb-5 inline-flex size-12 items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-4deg] group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30">
        <Icon className="size-5" />
      </span>
      <h3 className="font-semibold tracking-tight">{feature.title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.description}</p>
    </SpotlightCard>
  );
}
