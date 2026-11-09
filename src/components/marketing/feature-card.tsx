import type { MarketingFeature } from "./feature-data";

export function FeatureCard({ feature }: { feature: MarketingFeature }) {
  const Icon = feature.icon;
  return (
    <div className="group bg-card hover:border-primary/40 relative rounded-2xl border p-6 transition-colors">
      <span className="bg-primary/10 text-primary group-hover:bg-brand-gradient mb-4 inline-flex size-11 items-center justify-center rounded-xl transition-colors group-hover:text-white">
        <Icon className="size-5" />
      </span>
      <h3 className="font-semibold">{feature.title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.description}</p>
    </div>
  );
}
