import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/features#integrations" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-muted/30 relative overflow-hidden">
      <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-[var(--brand-purple)] to-transparent opacity-50" />
      <div aria-hidden className="bg-brand-gradient pointer-events-none absolute -bottom-40 left-1/2 h-64 w-[60rem] -translate-x-1/2 rounded-full opacity-10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]" data-reveal-stagger>
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">
            AI-powered planning, content creation and analytics for sustainable, organic social media growth.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-medium">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted-foreground hover:text-foreground inline-block text-sm transition-all duration-300 hover:translate-x-1">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="relative border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>Platform names are trademarks of their respective owners. Integrations use official APIs only.</p>
        </div>
      </div>
    </footer>
  );
}
