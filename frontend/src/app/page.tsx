import Image from "next/image";
import Link from "next/link";

const crmBase =
  (process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3001").replace(/\/$/, "");

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(166,112,102,0.22),transparent_45%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="BonPainer"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
            priority
          />
          <div>
            <p className="font-display text-xl text-[var(--gold-bright)]">BonPainer</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-dim)]">
              The French Bakery Cafe & Store
            </p>
          </div>
        </div>
        <a
          href={`${crmBase}/login`}
          className="rounded-full border border-[var(--gold)]/40 px-5 py-2 text-sm text-[var(--gold-bright)] transition hover:bg-[var(--gold)]/10"
        >
          Staff login
        </a>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">
          Digital menu · Kitchen dashboard
        </p>
        <h1 className="font-display mt-4 max-w-3xl text-5xl leading-tight text-[var(--text)] sm:text-7xl">
          BonPainer
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
          Customers scan a table QR or NFC tag, order from your digital menu, and staff see every
          order appear live on the counter dashboard.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/r/BonPainer/t/12"
            className="rounded-md bg-[var(--gold)] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-[var(--bg)]"
          >
            Try demo menu
          </Link>
          <a
            href={`${crmBase}/login`}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-7 py-3.5 text-sm font-semibold text-[var(--text)]"
          >
            Open dashboard
          </a>
        </div>

        <dl className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Table URL",
              body: "/r/BonPainer/t/12 — NFC and QR only store this link.",
            },
            {
              title: "Live orders",
              body: "NEW → ACCEPTED → PREPARING → READY → COMPLETED",
            },
            {
              title: "Multi-restaurant",
              body: "Each restaurant only sees its own menu, tables, and orders.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <dt className="font-display text-lg text-[var(--gold-bright)]">{item.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
