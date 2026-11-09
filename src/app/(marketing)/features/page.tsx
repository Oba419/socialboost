import { CheckCircle2, CircleDashed, CircleSlash } from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { FEATURE_GROUPS } from "@/components/marketing/feature-data";
import { FinalCTASection } from "@/components/marketing/home-sections";
import { Section } from "@/components/marketing/section";
import { PLATFORM_LIST, type CapabilityLevel, type PlatformCapabilities } from "@/config/platforms";

export const metadata = {
  title: "Features",
  description: "AI content creation, planning, growth coaching, research and analytics for every major social platform.",
};

const CAP_ROWS: { key: keyof Omit<PlatformCapabilities, "scheduling">; label: string }[] = [
  { key: "oauth", label: "Secure account connection" },
  { key: "followerCount", label: "Follower count" },
  { key: "accountInsights", label: "Account insights" },
  { key: "publishText", label: "Publish text posts" },
  { key: "publishImage", label: "Publish images" },
  { key: "publishVideo", label: "Publish videos" },
];

function CapIcon({ level }: { level: CapabilityLevel }) {
  if (level === "supported") return <CheckCircle2 className="text-success mx-auto size-4" aria-label="Supported" />;
  if (level === "limited") return <CircleDashed className="text-warning mx-auto size-4" aria-label="Limited" />;
  return <CircleSlash className="text-muted-foreground/50 mx-auto size-4" aria-label="Not available" />;
}

export default function FeaturesPage() {
  return (
    <>
      <div>
        <Section
          as="h1"
          eyebrow="Features"
          title="Everything you need to plan, create and grow"
          description="One workspace for AI-assisted content, scheduling, coaching and analytics — built around honest, organic growth."
          className="pb-8"
        >
          <nav aria-label="Feature categories" className="flex flex-wrap justify-center gap-2">
            {FEATURE_GROUPS.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="glass hover:border-primary/40 rounded-full border px-4 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10">
                {g.title}
              </a>
            ))}
            <a href="#integrations" className="glass hover:border-primary/40 rounded-full border px-4 py-1.5 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10">
              Integrations
            </a>
          </nav>
        </Section>
      </div>

      {FEATURE_GROUPS.map((group) => (
        <Section
          key={group.id}
          id={group.id}
          eyebrow={group.title}
          title={group.description}
          centered={false}
          revealChildren={false}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal-stagger>
            {group.items.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </Section>
      ))}

      <Section
        id="integrations"
        eyebrow="Integrations"
        title="What each platform supports"
        description="We only use official APIs. What's possible depends on each platform's permissions, your account type and the platform's approval of our developer app."
      >
        <div className="bg-card/70 overflow-x-auto rounded-3xl border shadow-xl shadow-primary/5 backdrop-blur-sm">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Platform capability matrix</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Capability</th>
                {PLATFORM_LIST.map((p) => (
                  <th key={p.id} scope="col" className="px-3 py-3 text-center font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {CAP_ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">{row.label}</th>
                  {PLATFORM_LIST.map((p) => (
                    <td key={p.id} className="px-3 py-3">
                      <CapIcon level={p.capabilities[row.key]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-normal">Scheduled publishing</th>
                {PLATFORM_LIST.map((p) => (
                  <td key={p.id} className="text-muted-foreground px-3 py-3 text-center text-xs">
                    {p.capabilities.scheduling === "manual" ? "Manual workflow" : "Automatic"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="text-success size-3.5" /> Supported via official API</span>
          <span className="inline-flex items-center gap-1.5"><CircleDashed className="text-warning size-3.5" /> Limited (account type, API tier or approval dependent)</span>
          <span className="inline-flex items-center gap-1.5"><CircleSlash className="size-3.5" /> Not available — use the export / manual workflow</span>
        </div>
      </Section>

      <FinalCTASection />
    </>
  );
}
