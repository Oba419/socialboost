import Link from "next/link";
import { PLATFORM_LIST } from "@/config/platforms";

function PlatformPill({ name, color }: { name: string; color: string }) {
  return (
    <li className="glass mx-2 flex shrink-0 items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-medium shadow-sm">
      <span className="relative flex size-2.5">
        <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: color }} />
        <span className="relative size-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      {name}
    </li>
  );
}

export function PlatformStrip() {
  return (
    <section aria-labelledby="platforms-heading" className="relative py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6" data-reveal>
        <h2 id="platforms-heading" className="text-muted-foreground text-center text-sm font-medium tracking-wide">
          Plan and create content for every major platform
        </h2>
      </div>

      {/* Infinite marquee: list rendered twice for a seamless loop; the copy is hidden from assistive tech. */}
      <div className="marquee mt-8 overflow-hidden" data-reveal="fade">
        <div className="marquee-track py-1">
          <ul className="flex" aria-label="Supported platforms">
            {PLATFORM_LIST.map((p) => (
              <PlatformPill key={p.id} name={p.name} color={p.color} />
            ))}
          </ul>
          <ul className="flex" aria-hidden>
            {PLATFORM_LIST.map((p) => (
              <PlatformPill key={p.id} name={p.name} color={p.color} />
            ))}
          </ul>
        </div>
      </div>

      <p className="text-muted-foreground mx-auto mt-8 max-w-2xl px-4 text-center text-xs" data-reveal>
        Account connections, analytics and direct publishing use each platform&apos;s official API and depend on its
        permissions and approval.{" "}
        <Link href="/features#integrations" className="text-foreground underline underline-offset-4 hover:text-primary">
          See what each platform supports
        </Link>
        .
      </p>
    </section>
  );
}
