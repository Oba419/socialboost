export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <header className="mb-10 space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">Last updated: {updated}</p>
        <p className="border-warning/40 bg-warning/5 rounded-lg border p-3 text-xs">
          Template for development. Have this reviewed by a qualified lawyer for your jurisdiction (e.g. NDPA 2023 in
          Nigeria, GDPR where applicable) before launch.
        </p>
      </header>
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
