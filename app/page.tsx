import Demo from "@/components/Demo";
import transcript from "@/data/transcript.json";
import { scenarios } from "@/lib/scenarios";
import type { Transcript } from "@/lib/types";
import { ArrowUpRight, CalendarCheck, CreditCard, LayoutDashboard, MessageCircle, ShieldCheck, UserRound } from "lucide-react";

const PORTFOLIO = "https://matthewchukwu.dev";

const saved = "scenarios" in transcript ? (transcript as Transcript) : null;

const steps = [
  { icon: MessageCircle, title: "Customer messages", body: "On WhatsApp, in plain language: dates, number of guests, questions about the place." },
  { icon: CalendarCheck, title: "Real availability", body: "Dates and prices come from your calendar in code, so the bot can't double-book or quote a wrong total." },
  { icon: CreditCard, title: "Paystack link", body: "The booking is held for 30 minutes and the guest pays by card, transfer or USSD. Paystack confirms it automatically." },
  { icon: LayoutDashboard, title: "Logged and confirmed", body: "The booking lands in your dashboard or sheet, and the guest gets a confirmation on WhatsApp." },
];

const promises = [
  { title: "Never misquotes", body: "The AI decides what to look up. Prices, dates and payment amounts are always worked out by code." },
  { title: "Knows when to call you", body: "Anything outside your policies, like airport pickups or discounts, goes to you with a short summary." },
  { title: "Works while you sleep", body: "Late-night enquiries get answered and paid for, instead of going cold until morning." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
      <span className="h-px w-8 bg-border" />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageCircle className="size-4" />
            </span>
            WhatsApp Booking Bot
          </a>
          <a
            href={`${PORTFOLIO}/#contact`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/15 px-4 text-sm font-medium transition-colors hover:bg-foreground/5">
            Book a call
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </header>

      <main id="top" className="flex-1">
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <Eyebrow>AI automation · lab project</Eyebrow>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-6xl">
            Bookings and payments on WhatsApp.{" "}
            <span className="text-muted-foreground">Even at 2am.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your customers already message you on WhatsApp. This bot checks your availability, takes the booking, sends a
            Paystack payment link and logs it, then hands over to you when a question needs a person. Watch it handle a
            fictional Lagos short-let business below.
          </p>
        </section>

        <section id="demo" className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <Demo scenarios={scenarios} transcript={saved} />
          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            {saved
              ? `Saved output from a real AI run${saved.paystack === "test" ? ", with payment links from Paystack test mode" : ""}`
              : "Showing a reference conversation until the saved model run is added."}
          </p>
        </section>

        <section className="border-y bg-muted/40 py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              From &ldquo;do you have space?&rdquo; to paid, in one chat.
            </h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="bg-background p-7">
                  <div className="flex items-center justify-between">
                    <Icon className="size-5 text-primary" />
                    <span className="font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-5 text-lg font-semibold tracking-tight">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
            <ul className="mt-12 grid gap-8 sm:grid-cols-3">
              {promises.map(({ title, body }) => (
                <li key={title}>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-12 flex max-w-3xl items-start gap-2 text-sm text-muted-foreground">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
              For a client, the bot runs on your own WhatsApp Business number. The same booking logic can also power a
              website chat or Instagram DMs.
            </p>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Want this on your WhatsApp?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
              Tell me how you take orders or bookings today. I&apos;ll show you what the bot would handle, and what it
              would pass to you.
            </p>
            <a
              href={`${PORTFOLIO}/#contact`}
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90">
              Book a call
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            Built by{" "}
            <a href={PORTFOLIO} className="font-medium text-foreground underline-offset-4 hover:underline">
              Matthew Chukwu
            </a>
          </p>
          <p className="font-mono text-xs">Next.js · Claude API · Paystack · Twilio</p>
        </div>
      </footer>
    </>
  );
}
