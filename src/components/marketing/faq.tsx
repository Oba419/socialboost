"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FAQItem {
  q: string;
  a: string;
}

export const DEFAULT_FAQ: FAQItem[] = [
  {
    q: "Will this guarantee more followers or viral posts?",
    a: "No tool can honestly guarantee that. We help you plan consistently, create better content and learn from real data — the habits behind sustainable organic growth.",
  },
  {
    q: "Do you need my social media passwords?",
    a: "Never. Accounts are connected through each platform's official OAuth sign-in. You can disconnect at any time and we revoke and delete stored credentials.",
  },
  {
    q: "Which platforms can I publish to directly?",
    a: "It depends on each platform's official API, your account type and the permissions the platform has approved. Where direct publishing isn't available, we provide a manual publishing workflow with reminders.",
  },
  {
    q: "Are the analytics real?",
    a: "Analytics come from connected platforms' APIs where available. Numbers you enter manually or import are labelled as such, and demo data is always clearly marked.",
  },
  {
    q: "What are AI credits?",
    a: "Each AI generation uses a small number of credits (for example, 1 for captions or 5 for a growth plan). Your plan includes a monthly allowance that resets each billing period.",
  },
  {
    q: "Do you use fake engagement or bots?",
    a: "No. We don't offer fake followers, likes, comments, engagement pods or mass-follow automation. Engagement suggestions are drafts for you to review and post yourself.",
  },
  {
    q: "Can I cancel or change plans?",
    a: "Yes. Upgrades take effect immediately after payment is verified. Downgrades and cancellations apply at the end of your current billing period.",
  },
];

export function FAQ({ items = DEFAULT_FAQ }: { items?: FAQItem[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item) => (
        <Collapsible
          key={item.q}
          className="group bg-card/70 data-[state=open]:border-primary/30 overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/10"
        >
          <h3>
            <CollapsibleTrigger className="hover:bg-muted/30 focus-visible:ring-ring flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset">
              {item.q}
              <span className="bg-muted group-data-[state=open]:bg-brand-gradient inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-500 group-data-[state=open]:text-white">
                <ChevronDown className="size-4 transition-transform duration-500 group-data-[state=open]:rotate-180" aria-hidden />
              </span>
            </CollapsibleTrigger>
          </h3>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <p className="text-muted-foreground px-6 pb-6 text-sm leading-relaxed">{item.a}</p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
