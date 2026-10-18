import Anthropic from "@anthropic-ai/sdk";
import { randomBytes } from "node:crypto";
import { createPaymentLink } from "./paystack";
import { apartments, BUSINESS, getApartment, MIN_NIGHTS, naira, nightsBetween, overlaps, POLICIES } from "./property";
import { HOLD_MINUTES, type Store } from "./store";
import type { Step } from "./types";

// The booking bot itself. It knows nothing about WhatsApp: a channel passes in the
// customer's message and sends back whatever replies come out. Prices, availability
// and payment links are all computed in code — the model only decides what to call.

export const MODEL = "claude-opus-5-5";

const system = (now: Date) => `You are the WhatsApp booking assistant for ${BUSINESS}, a short-let apartment business in Lagos, Nigeria.

Today is ${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })}.

Apartments:
${apartments.map((a) => `- ${a.name} (id ${a.id}): up to ${a.maxGuests} guests, ${naira(a.nightly)} per night`).join("\n")}

Policies:
${POLICIES}

How to help:
- Use check_availability for any question about dates or prices. Never work out availability or totals yourself.
- To book, you need the apartment, dates, number of guests, the guest's full name and email address (for the Paystack receipt). Ask for anything missing, then call create_booking and send the payment link.
- Only answer from the policies above and your tool results. If a customer asks for something they don't cover, such as extra services, discounts or changes to an existing booking, say you'll check with the host and call hand_off_to_human. Don't guess.
- This is WhatsApp: keep messages short and friendly, use plain text with line breaks, and use *single asterisks* for bold sparingly. No markdown headings or tables.`;

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "check_availability",
    description: "Lists apartments that can take the given number of guests, whether each is free for the dates, and the total price.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        check_in: { type: "string", description: "YYYY-MM-DD" },
        check_out: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer" },
      },
      required: ["check_in", "check_out", "guests"],
      additionalProperties: false,
    },
  },
  {
    name: "create_booking",
    description: `Creates a booking held for ${HOLD_MINUTES} minutes and returns a Paystack payment link for the full stay.`,
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        apartment_id: { type: "string", enum: apartments.map((a) => a.id) },
        check_in: { type: "string", description: "YYYY-MM-DD" },
        check_out: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer" },
        guest_name: { type: "string" },
        guest_email: { type: "string" },
      },
      required: ["apartment_id", "check_in", "check_out", "guests", "guest_name", "guest_email"],
      additionalProperties: false,
    },
  },
  {
    name: "hand_off_to_human",
    description: "Notifies the host to take over this chat. Tell the customer you're checking with the host before or after calling it.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One or two sentences for the host: what the customer wants." },
      },
      required: ["summary"],
      additionalProperties: false,
    },
  },
];

type Ctx = { store: Store; conversationId: string; phone: string; now: Date };

function validateDates(checkIn: string, checkOut: string, now: Date) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(checkIn) || !iso.test(checkOut) || isNaN(Date.parse(checkIn)) || isNaN(Date.parse(checkOut))) {
    return "Dates must be valid YYYY-MM-DD dates.";
  }
  if (checkIn < now.toISOString().slice(0, 10)) return "Check-in date is in the past.";
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < MIN_NIGHTS) return `Minimum stay is ${MIN_NIGHTS} nights.`;
  return null;
}

function isFree(apartmentId: string, checkIn: string, checkOut: string, ctx: Ctx) {
  const apt = getApartment(apartmentId)!;
  const taken = [
    ...apt.booked,
    ...ctx.store.activeBookings(ctx.now).filter((b) => b.apartment_id === apartmentId).map((b) => [b.check_in, b.check_out] as [string, string]),
  ];
  return !taken.some((range) => overlaps(range, [checkIn, checkOut]));
}

export async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx): Promise<Record<string, unknown>> {
  if (name === "check_availability") {
    const { check_in, check_out, guests } = input as { check_in: string; check_out: string; guests: number };
    const error = validateDates(check_in, check_out, ctx.now);
    if (error) return { error };
    const nights = nightsBetween(check_in, check_out);
    const options = apartments
      .filter((a) => a.maxGuests >= guests)
      .map((a) => ({
        apartment_id: a.id,
        name: a.name,
        available: isFree(a.id, check_in, check_out, ctx),
        total: naira(a.nightly * nights),
      }));
    return options.length ? { nights, options } : { nights, options, note: `No apartment takes ${guests} guests.` };
  }

  if (name === "create_booking") {
    const b = input as { apartment_id: string; check_in: string; check_out: string; guests: number; guest_name: string; guest_email: string };
    const apt = getApartment(b.apartment_id);
    if (!apt) return { error: "Unknown apartment." };
    const error = validateDates(b.check_in, b.check_out, ctx.now);
    if (error) return { error };
    if (b.guests > apt.maxGuests) return { error: `${apt.name} takes up to ${apt.maxGuests} guests.` };
    if (!isFree(apt.id, b.check_in, b.check_out, ctx)) return { error: "Those dates were just taken." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.guest_email)) return { error: "That email address doesn't look valid." };

    const amount = apt.nightly * nightsBetween(b.check_in, b.check_out);
    const reference = `EWA-${randomBytes(3).toString("hex").toUpperCase()}`;
    const link = await createPaymentLink({
      email: b.guest_email,
      amountNaira: amount,
      reference,
      metadata: { apartment: apt.name, check_in: b.check_in, check_out: b.check_out, phone: ctx.phone },
    });
    ctx.store.addBooking({
      reference,
      apartment_id: apt.id,
      check_in: b.check_in,
      check_out: b.check_out,
      guests: b.guests,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      phone: ctx.phone,
      amount,
      status: "awaiting_payment",
      payment_url: link.url,
      created_at: ctx.now.toISOString(),
    });
    return { reference, amount: naira(amount), payment_link: link.url, held_for_minutes: HOLD_MINUTES };
  }

  if (name === "hand_off_to_human") {
    ctx.store.conversation(ctx.conversationId).handed_off = true;
    return { status: "Host notified. They usually reply within an hour, 8am to 8pm." };
  }

  return { error: `Unknown tool ${name}` };
}

/**
 * Handles one incoming customer message: runs the model and any tools it calls,
 * saves the conversation, and returns the replies to send plus a log of tool calls.
 */
export async function handleMessage(text: string, ctx: Ctx): Promise<{ replies: string[]; steps: Step[] }> {
  const client = new Anthropic();
  const convo = ctx.store.conversation(ctx.conversationId);
  convo.messages.push({ role: "user", content: text });

  const replies: string[] = [];
  const steps: Step[] = [];
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: system(ctx.now),
      output_config: { effort: "medium" },
      tools,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: convo.messages,
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined this message.");
    convo.messages.push({ role: "assistant", content: response.content });

    const reply = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (reply) {
      replies.push(reply);
      steps.push({ kind: "bot", text: reply, at: ctx.now.toISOString() });
    }
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, unknown>;
      const output = await runTool(block.name, input, ctx);
      steps.push({ kind: "tool", name: block.name, input, output });
      results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output), is_error: "error" in output });
    }
    convo.messages.push({ role: "user", content: results });
  }

  ctx.store.save();
  return { replies, steps };
}
