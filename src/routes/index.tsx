import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EU Job Market Radar" },
      { name: "description", content: "Weekly snapshot of European layoffs, hiring moves, and rising skills." },
    ],
  }),
  component: Dashboard,
});

type Level = "low" | "moderate" | "elevated" | "high";
type Trend = "up" | "down" | "flat";

interface Country {
  name: string; code: string; layoff_level: Level; layoff_score: number;
  events: number; vacancies: number; headline: string; headline_url: string; summary: string;
}
interface TopEvent {
  company: string; country: string; type: string; jobs_affected?: number;
  title: string; url: string; date: string;
}
interface RisingSkill { skill: string; demand_index: number; trend: Trend; evidence: string; }
interface Shortage { country: string; occupation: string; severity: number; }
interface Data {
  generated_at: string; period: string; summary: string;
  countries: Country[]; top_events: TopEvent[]; rising_skills: RisingSkill[];
  shortages: Shortage[]; sources_count: number;
}

const FLAGS: Record<string, string> = {
  DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", SE: "🇸🇪",
  DK: "🇩🇰", FI: "🇫🇮", PL: "🇵🇱", IE: "🇮🇪", BE: "🇧🇪", AT: "🇦🇹",
  PT: "🇵🇹", CZ: "🇨🇿", GR: "🇬🇷", HU: "🇭🇺", RO: "🇷🇴",
  CH: "🇨🇭", NO: "🇳🇴", GB: "🇬🇧", EU: "🇪🇺",
};
const NAME_TO_CODE: Record<string, string> = {
  Germany: "DE", France: "FR", Italy: "IT", Spain: "ES", Netherlands: "NL",
  Sweden: "SE", Denmark: "DK", Finland: "FI", Poland: "PL", Ireland: "IE",
  Belgium: "BE", Austria: "AT", Portugal: "PT", Czechia: "CZ", Greece: "GR",
  Switzerland: "CH", Norway: "NO", Europe: "EU", EU: "EU", EU27: "EU",
};
const flagFor = (code?: string) => (code && FLAGS[code]) || "🇪🇺";
const flagByName = (name: string) => FLAGS[NAME_TO_CODE[name] ?? ""] ?? "🇪🇺";

const levelStyles: Record<Level, { bar: string; chip: string; label: string }> = {
  low:      { bar: "bg-[var(--color-level-low)]",      chip: "bg-[var(--color-level-low)]/15 text-[oklch(0.4_0.12_155)]",   label: "Low" },
  moderate: { bar: "bg-[var(--color-level-moderate)]", chip: "bg-[var(--color-level-moderate)]/25 text-[oklch(0.4_0.12_80)]", label: "Moderate" },
  elevated: { bar: "bg-[var(--color-level-elevated)]", chip: "bg-[var(--color-level-elevated)]/20 text-[oklch(0.4_0.15_50)]", label: "Elevated" },
  high:     { bar: "bg-[var(--color-level-high)]",     chip: "bg-[var(--color-level-high)]/15 text-[oklch(0.4_0.18_27)]",     label: "High" },
};

function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("./data.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(String(e?.message ?? e)); });
    return () => { alive = false; };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;
  return <DashboardView data={data} />;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span className="text-sm tracking-widest uppercase">Loading market data…</span>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--color-level-high)]">Data unavailable</p>
        <h1 className="mt-2 font-serif text-3xl">Couldn't load today's snapshot</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function DashboardView({ data }: { data: Data }) {
  const countries = useMemo(() => [...data.countries].sort((a, b) => b.layoff_score - a.layoff_score), [data.countries]);
  const events = useMemo(() => [...data.top_events].sort((a, b) => (b.jobs_affected ?? 0) - (a.jobs_affected ?? 0)), [data.top_events]);
  const skills = useMemo(() => [...data.rising_skills].sort((a, b) => b.demand_index - a.demand_index), [data.rising_skills]);
  const shortages = useMemo(() => [...data.shortages].sort((a, b) => b.severity - a.severity), [data.shortages]);

  const updated = new Date(data.generated_at);
  const updatedStr = isNaN(updated.getTime()) ? data.generated_at :
    updated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> EU · Weekly
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl leading-tight">EU Job Market Radar</h1>
            <p className="text-muted-foreground mt-1 text-sm">{data.period}</p>
          </div>
          <div className="text-xs text-muted-foreground">Updated {updatedStr}</div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <p className="font-serif text-2xl sm:text-3xl md:text-4xl leading-snug text-foreground/90 max-w-4xl">
          {data.summary}
        </p>
      </section>

      <Section title="Country layoff heat" caption="Sorted by layoff intensity score (0–1).">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => {
            const s = levelStyles[c.layoff_level];
            const pct = Math.round(c.layoff_score * 100);
            return (
              <article key={c.code} className="group rounded-xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_oklch(0.38_0.13_255_/_0.25)]">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{flagFor(c.code)}</span>
                    <h3 className="font-semibold">{c.name}</h3>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${s.chip}`}>{s.label}</span>
                </header>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Layoff score</span><span className="tabular-nums">{pct}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${s.bar} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Events" value={c.events.toLocaleString()} />
                  <Stat label="Vacancies" value={c.vacancies.toLocaleString()} />
                </dl>
                <a href={c.headline_url} target="_blank" rel="noreferrer noopener"
                   className="mt-4 block text-sm text-foreground hover:text-accent underline-offset-4 hover:underline">
                  {c.headline} <span aria-hidden>→</span>
                </a>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Biggest moves this week" caption="Workforce events ranked by jobs affected.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => (
            <article key={i} className="rounded-xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-accent/40">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg" aria-hidden>{flagByName(e.country)}</span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{e.company}</p>
                    <p className="text-xs text-muted-foreground">{e.country} · {e.date}</p>
                  </div>
                </div>
                <TypeBadge type={e.type} />
              </header>
              {typeof e.jobs_affected === "number" && (
                <p className="mt-4 font-serif text-3xl tabular-nums">
                  {e.jobs_affected.toLocaleString()}<span className="text-sm font-sans text-muted-foreground ml-1.5">jobs</span>
                </p>
              )}
              <a href={e.url} target="_blank" rel="noreferrer noopener"
                 className="mt-3 block text-sm hover:text-accent underline-offset-4 hover:underline">
                {e.title} <span aria-hidden>→</span>
              </a>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Skills on the rise" caption="Demand index 0–100 across EU job postings.">
        <ol className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {skills.map((s, i) => (
            <li key={s.skill} className="p-5 grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1.4fr_2fr_auto] gap-4 items-center">
              <span className="font-serif text-xl tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TrendArrow trend={s.trend} />
                  <p className="font-semibold truncate">{s.skill}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 sm:hidden">{s.evidence}</p>
              </div>
              <p className="hidden sm:block text-xs text-muted-foreground">{s.evidence}</p>
              <div className="flex items-center gap-3 justify-self-end col-start-2 sm:col-start-auto">
                <div className="hidden sm:block w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${s.demand_index}%` }} />
                </div>
                <span className="tabular-nums font-semibold text-sm w-8 text-right">{s.demand_index}</span>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="EU skills shortages" caption="Source: Cedefop. Severity scaled 1–4; highlights ≥ 3.5.">
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
              <tr>
                <th className="text-left font-medium px-5 py-3">Country</th>
                <th className="text-left font-medium px-5 py-3">Occupation</th>
                <th className="text-right font-medium px-5 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shortages.map((s, i) => {
                const hot = s.severity >= 3.5;
                return (
                  <tr key={i} className={hot ? "bg-[var(--color-level-high)]/5" : ""}>
                    <td className="px-5 py-3"><span className="mr-2" aria-hidden>{flagByName(s.country)}</span>{s.country}</td>
                    <td className="px-5 py-3">{s.occupation}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`tabular-nums font-semibold ${hot ? "text-[var(--color-level-high)]" : ""}`}>
                        {s.severity.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <footer className="border-t border-border mt-20">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Built from {data.sources_count} public sources. Not financial advice.</p>
          <a href="https://github.com/" target="_blank" rel="noreferrer noopener" className="hover:text-accent underline-offset-4 hover:underline">
            View on GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 border-t border-border">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl sm:text-3xl">{title}</h2>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls =
    t.includes("layoff") ? "bg-[var(--color-level-high)]/12 text-[oklch(0.4_0.18_27)]" :
    t.includes("hire") || t.includes("expan") ? "bg-[var(--color-level-low)]/15 text-[oklch(0.4_0.12_155)]" :
    "bg-accent-soft text-accent";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold whitespace-nowrap ${cls}`}>{type}</span>;
}

function TrendArrow({ trend }: { trend: Trend }) {
  const map = {
    up:   { c: "text-[var(--color-level-low)]", s: "↑" },
    down: { c: "text-[var(--color-level-high)]", s: "↓" },
    flat: { c: "text-muted-foreground", s: "→" },
  } as const;
  const t = map[trend];
  return <span className={`${t.c} font-bold`} aria-label={`trend ${trend}`}>{t.s}</span>;
}
