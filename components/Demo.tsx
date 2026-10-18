"use client";

import { getApartment, naira } from "@/lib/property";
import type { Scenario } from "@/lib/scenarios";
import type { Step, Transcript } from "@/lib/types";
import { CalendarSearch, CheckCheck, CreditCard, Link2, Pause, Play, RotateCcw, SkipForward, UserRound } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** WhatsApp-style text: *bold*, line breaks, and links shown (not clickable — they're test or placeholder links). */
function WaText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-line break-words">
      {text.split(/(\*[^*\n]+\*|https?:\/\/\S+)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <strong key={i}>{part.slice(1, -1)}</strong>
        ) : /^https?:\/\//.test(part) ? (
          <span key={i} className="text-sky-600 underline dark:text-sky-400">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

const TOOL_META: Record<string, { icon: typeof CalendarSearch; label: string }> = {
  check_availability: { icon: CalendarSearch, label: "Checked availability" },
  create_booking: { icon: Link2, label: "Created booking + Paystack link" },
  hand_off_to_human: { icon: UserRound, label: "Handed over to the host" },
};

function ToolCard({ step }: { step: Extract<Step, { kind: "tool" }> }) {
  const meta = TOOL_META[step.name] ?? { icon: CalendarSearch, label: step.name };
  const Icon = meta.icon;
  const out = step.output as Record<string, unknown>;
  let detail: React.ReactNode = null;

  if (step.name === "check_availability" && Array.isArray(out.options)) {
    const i = step.input as { check_in: string; check_out: string; guests: number };
    detail = (
      <>
        <p className="text-muted-foreground">
          {i.check_in} → {i.check_out} · {i.guests} guests · {String(out.nights)} nights
        </p>
        <ul className="mt-2 space-y-1">
          {(out.options as { name: string; available: boolean; total: string }[]).map((o) => (
            <li key={o.name} className="flex justify-between gap-3">
              <span className={o.available ? "" : "text-muted-foreground line-through"}>{o.name}</span>
              <span className={cx("font-mono tabular-nums", !o.available && "text-muted-foreground")}>
                {o.available ? o.total : "taken"}
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (step.name === "create_booking" && out.reference) {
    detail = (
      <p className="text-muted-foreground">
        <span className="font-mono text-foreground">{String(out.reference)}</span> · {String(out.amount)} · held{" "}
        {String(out.held_for_minutes)} min
      </p>
    );
  } else if (step.name === "hand_off_to_human") {
    detail = <p className="text-muted-foreground">&ldquo;{String(step.input.summary)}&rdquo;</p>;
  } else if (out.error) {
    detail = <p className="text-warn">{String(out.error)}</p>;
  }

  return (
    <li className="fade-up rounded-2xl border bg-background p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
        {meta.label}
      </p>
      {detail && <div className="mt-2 text-[13px]">{detail}</div>}
    </li>
  );
}

export default function Demo({ scenarios, transcript }: { scenarios: Scenario[]; transcript: Transcript | null }) {
  const [id, setId] = useState(scenarios[0].id);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const scenario = scenarios.find((s) => s.id === id)!;
  const steps = transcript?.scenarios[id] ?? scenario.reference;
  const visible = steps.slice(0, shown);
  const next = steps[shown];
  const done = shown >= steps.length;

  useEffect(() => {
    if (!playing || done) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 400 : next.kind === "customer" ? 1300 : next.kind === "bot" ? 1600 : 700;
    const t = window.setTimeout(() => setShown((n) => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [playing, done, next, shown]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown]);

  const choose = (next: string) => {
    setId(next);
    setShown(0);
    setPlaying(false);
  };

  const restart = () => {
    setShown(0);
    setPlaying(true);
  };

  // The bookings table, built from what has happened so far.
  const bookings = visible.flatMap((s) => {
    if (s.kind !== "tool" || s.name !== "create_booking" || !s.output.reference) return [];
    const input = s.input as { apartment_id: string; check_in: string; check_out: string; guest_name: string };
    const paid = visible.find((p) => p.kind === "payment" && p.reference === s.output.reference);
    return [{ reference: String(s.output.reference), amount: String(s.output.amount), paid: Boolean(paid), ...input }];
  });
  const backstage = visible.filter((s): s is Extract<Step, { kind: "tool" | "payment" }> => s.kind === "tool" || s.kind === "payment");
  const typing = playing && next?.kind === "bot";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Scenarios" className="flex flex-wrap gap-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === id}
              onClick={() => choose(s.id)}
              className={cx(
                "rounded-2xl border px-4 py-2.5 text-left transition-colors",
                s.id === id ? "border-primary/50 bg-primary/10" : "hover:bg-muted",
              )}>
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{s.blurb}</span>
            </button>
          ))}
        </div>
        <span
          className={cx(
            "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px]",
            transcript ? "border-primary/40 text-primary" : "text-muted-foreground",
          )}>
          {transcript
            ? `${transcript.model} · saved run ${new Date(transcript.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
            : "Reference conversation · model run pending"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Phone */}
        <div className="mx-auto w-full max-w-[26rem] overflow-hidden rounded-[2.25rem] border-8 border-foreground/10 bg-wa-bg shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">ES</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Ewa Stays</p>
              <p className="text-[11px] text-muted-foreground">{typing ? "typing…" : "Business account"}</p>
            </div>
          </div>
          <div ref={chatRef} className="flex h-[30rem] flex-col gap-2 overflow-y-auto px-3 py-4">
            {visible.length === 0 && (
              <p className="m-auto max-w-[16rem] rounded-xl bg-card/80 px-3 py-2 text-center text-xs text-muted-foreground">
                Press play to watch a real conversation with the bot, step by step.
              </p>
            )}
            {visible.map((s, i) => {
              if (s.kind === "tool") return null;
              if (s.kind === "payment") {
                return (
                  <p key={i} className="fade-up mx-auto my-1 flex items-center gap-1.5 rounded-lg bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground">
                    <CreditCard className="size-3.5 text-primary" />
                    Paid {naira(s.amount)} on Paystack checkout
                  </p>
                );
              }
              const mine = s.kind === "customer";
              return (
                <div
                  key={i}
                  className={cx(
                    "fade-up max-w-[85%] rounded-xl px-3 py-2 text-[14px] leading-snug shadow-sm",
                    mine ? "self-end rounded-tr-sm bg-wa-out" : "self-start rounded-tl-sm bg-wa-in",
                  )}>
                  <WaText text={s.text} />
                  <span className="float-right ml-3 mt-1.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    {time(s.at)}
                    {mine && <CheckCheck className="size-3.5 text-sky-500" />}
                  </span>
                </div>
              );
            })}
            {typing && (
              <span className="fade-up flex w-fit gap-1 self-start rounded-xl rounded-tl-sm bg-wa-in px-3 py-3 shadow-sm">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-card px-3 py-3">
            <button
              onClick={() => (done ? restart() : setPlaying((p) => !p))}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              {done ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              {done ? "Replay" : playing ? "Pause" : shown === 0 ? "Play conversation" : "Resume"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setShown((n) => Math.min(n + 1, steps.length));
              }}
              disabled={done}
              aria-label="Next step"
              className="inline-flex size-10 items-center justify-center rounded-full border transition-colors hover:bg-muted disabled:opacity-40">
              <SkipForward className="size-4" />
            </button>
          </div>
        </div>

        {/* Behind the scenes */}
        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Behind the scenes</p>
            {backstage.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Every availability check, price, booking and payment is done in code, not by the AI. Each step shows up
                here as it happens.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {backstage.map((s, i) =>
                  s.kind === "tool" ? (
                    <ToolCard key={i} step={s} />
                  ) : (
                    <li key={i} className="fade-up rounded-2xl border border-primary/40 bg-background p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold">
                        <CreditCard className="size-4 text-primary" />
                        Paystack webhook: payment confirmed
                      </p>
                      <p className="mt-2 text-[13px] text-muted-foreground">
                        <span className="font-mono text-foreground">{s.reference}</span> · {naira(s.amount)} · booking marked
                        paid, confirmation sent from a template
                      </p>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Bookings dashboard</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Ref</th>
                    <th className="px-3 py-2 font-medium">Guest</th>
                    <th className="px-3 py-2 font-medium">Apartment</th>
                    <th className="px-3 py-2 font-medium">Dates</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="py-2 pl-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No bookings yet
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.reference} className="fade-up border-b last:border-0">
                        <td className="py-2.5 pr-3 font-mono text-xs">{b.reference}</td>
                        <td className="px-3 py-2.5">{b.guest_name}</td>
                        <td className="px-3 py-2.5">{getApartment(b.apartment_id)?.name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {b.check_in.slice(5)} → {b.check_out.slice(5)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{b.amount}</td>
                        <td className="py-2.5 pl-3 text-right">
                          <span
                            className={cx(
                              "inline-flex rounded-full border px-2 py-0.5 text-xs whitespace-nowrap",
                              b.paid ? "border-primary/40 text-primary" : "border-warn/50 text-warn",
                            )}>
                            {b.paid ? "Paid" : "Awaiting payment"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
