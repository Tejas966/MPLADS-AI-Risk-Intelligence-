import Link from "next/link";

export default function Header() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface px-4 md:px-8 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-block focus:outline-none focus:ring-2 focus:ring-brand rounded">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                <span className="text-brand">MPLADS</span> AI Risk Intelligence
              </h1>
            </Link>
            <p className="text-foreground-secondary text-xs mt-0.5">
              Assisting human review. Priority scores do not establish wrongdoing.
            </p>
          </div>
          <div className="text-xs text-foreground-secondary border border-border px-3 py-1.5 rounded-lg flex items-center gap-3 bg-surface-secondary w-fit">
            <span>SIH 2026 · Problem SIH26102</span>
            <div className="h-4 w-px bg-border hidden sm:block"></div>
            <span className="hidden sm:inline">Role: Ministry Admin</span>
          </div>
        </div>
      </header>
    </>
  );
}
