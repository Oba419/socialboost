import Link from "next/link";
import { PLATFORM_LIST } from "@/config/platforms";

export function PlatformStrip() {
  return (
    <section aria-labelledby="platforms-heading" className="border-y py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 id="platforms-heading" className="text-muted-foreground text-center text-sm">
          Plan and create content for every major platform
        </h2>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
          {PLATFORM_LIST.map((p) => (
            <li
              key={p.id}
              className="bg-card flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
              {p.name}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-xs">
          Account connections, analytics and direct publishing use each platform&apos;s official API and depend on
          its permissions and approval.{" "}
          <Link href="/features#integrations" className="text-foreground underline underline-offset-4">
            See what each platform supports
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
