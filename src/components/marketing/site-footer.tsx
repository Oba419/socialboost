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
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
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
                  <Link href={l.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
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
