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
    <div className="mx-auto max-w-3xl divide-y rounded-2xl border">
      {items.map((item) => (
        <Collapsible key={item.q} className="group">
          <h3>
            <CollapsibleTrigger className="hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset">
              {item.q}
              <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
          </h3>
          <CollapsibleContent className="text-muted-foreground px-5 pb-5 text-sm leading-relaxed">{item.a}</CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
