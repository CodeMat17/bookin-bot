// Runs the real bot over the scripted customer messages and saves what happens to
// data/transcript.json. The public site only ever reads that file — visitors never
// trigger an API call. Run: yarn simulate  (needs ANTHROPIC_API_KEY; PAYSTACK_SECRET_KEY optional)
//
// The payment step goes through the same confirmPayment() the Paystack webhook uses;
// only the webhook call itself is simulated.
import { writeFileSync } from "node:fs";
import { handleMessage, MODEL } from "../lib/bot";
import { confirmPayment } from "../lib/payments";
import { paystackMode } from "../lib/paystack";
import { scenarios, SIM_START } from "../lib/scenarios";
import { Store } from "../lib/store";
import type { Step, Transcript } from "../lib/types";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY first (e.g. in .env.local, then: yarn simulate).");
    process.exit(1);
  }
  const mode = paystackMode();
  if (mode === "live") {
    console.error("PAYSTACK_SECRET_KEY is a live key. Use a test key (sk_test_...) for the simulation.");
    process.exit(1);
  }
  console.log(mode === "test" ? "Paystack: test mode" : "Paystack: no key, using placeholder links");

  const transcript: Transcript = { model: MODEL, generated_at: new Date().toISOString(), paystack: mode, scenarios: {} };
  for (const scenario of scenarios) {
    console.log(`\n=== ${scenario.label}`);
    const store = new Store();
    const phone = "whatsapp:+2348030000000";
    const steps: Step[] = [];
    let minute = 0;

    for (const text of scenario.customer) {
      const now = new Date(Date.parse(SIM_START) + minute * 60_000);
      steps.push({ kind: "customer", text, at: now.toISOString() });
      console.log(`\n> ${text}`);
      const result = await handleMessage(text, { store, conversationId: scenario.id, phone, now });
      for (const step of result.steps) {
        steps.push(step);
        if (step.kind === "tool") console.log(`  [${step.name}] ${JSON.stringify(step.input)} -> ${JSON.stringify(step.output)}`);
        if (step.kind === "bot") console.log(step.text.replace(/^/gm, "  "));
      }
      minute += 2;
    }

    const pending = store.bookings().find((b) => b.status === "awaiting_payment");
    if (scenario.pay) {
      if (!pending) {
        console.log("\n!! No booking was created, so there is nothing to pay. Check the transcript above.");
      } else {
        const now = new Date(Date.parse(SIM_START) + (minute + 1) * 60_000);
        const result = confirmPayment(store, pending.reference, now)!;
        steps.push({ kind: "payment", reference: pending.reference, amount: pending.amount, at: now.toISOString() });
        steps.push({ kind: "bot", text: result.message!, at: now.toISOString() });
        console.log(`\n  [payment] ${pending.reference} paid\n${result.message!.replace(/^/gm, "  ")}`);
      }
    }
    transcript.scenarios[scenario.id] = steps;
  }

  writeFileSync("data/transcript.json", JSON.stringify(transcript, null, 2) + "\n");
  console.log("\nSaved data/transcript.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
