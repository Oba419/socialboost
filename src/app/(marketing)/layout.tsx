import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip">
      {/* Page-top aurora that also glows behind the transparent header */}
      <div
        aria-hidden
        className="aurora noise -z-10 h-[1100px] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
      >
        <span />
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] opacity-50" />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
