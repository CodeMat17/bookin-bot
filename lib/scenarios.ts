import type { Step } from "./types";

// Scripted customer messages for the demo. `yarn simulate` sends them to the real
// bot and saves what it does to data/transcript.json. `reference` is a hand-written
// version shown until that run exists.

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  customer: string[];
  /** Simulate a successful Paystack payment once a booking link has been sent. */
  pay: boolean;
  reference: Step[];
};

/** The simulated clock: the chat happens on this morning in Lagos. */
export const SIM_START = "2026-11-20T08:00:00.000Z";

const at = (minutes: number) => new Date(Date.parse(SIM_START) + minutes * 60_000).toISOString();

export const scenarios: Scenario[] = [
  {
    id: "booking",
    label: "Book and pay",
    blurb: "Availability, a question, then a Paystack link",
    pay: true,
    customer: [
      "Hi, do you have anything for 2 people from 12 to 15 December?",
      "Yes please! Is there constant light? I work from home",
      "Tolu Adebayo, tolu.adebayo@example.com",
    ],
    reference: [
      { kind: "customer", text: "Hi, do you have anything for 2 people from 12 to 15 December?", at: at(0) },
      {
        kind: "tool",
        name: "check_availability",
        input: { check_in: "2026-12-12", check_out: "2026-12-15", guests: 2 },
        output: {
          nights: 3,
          options: [
            { apartment_id: "studio-lekki", name: "Studio, Lekki Phase 1", available: false, total: "₦135,000" },
            { apartment_id: "1bed-lekki", name: "1-bedroom, Lekki Phase 1", available: true, total: "₦195,000" },
            { apartment_id: "2bed-vi", name: "2-bedroom, Victoria Island", available: false, total: "₦360,000" },
          ],
        },
      },
      {
        kind: "bot",
        text: "Hi! For 12 to 15 December (3 nights, 2 guests), the *1-bedroom in Lekki Phase 1* is free. It's ₦195,000 for the stay.\n\nThe studio and the 2-bedroom are already booked those nights. Would you like the 1-bedroom?",
        at: at(0),
      },
      { kind: "customer", text: "Yes please! Is there constant light? I work from home", at: at(2) },
      {
        kind: "bot",
        text: "Yes, every apartment has 24-hour power (inverter and generator) and Wi-Fi, so working from home is no problem.\n\nTo book, please send your full name and email address for the Paystack receipt.",
        at: at(2),
      },
      { kind: "customer", text: "Tolu Adebayo, tolu.adebayo@example.com", at: at(4) },
      {
        kind: "tool",
        name: "create_booking",
        input: {
          apartment_id: "1bed-lekki",
          check_in: "2026-12-12",
          check_out: "2026-12-15",
          guests: 2,
          guest_name: "Tolu Adebayo",
          guest_email: "tolu.adebayo@example.com",
        },
        output: {
          reference: "EWA-3F9A21",
          amount: "₦195,000",
          payment_link: "https://checkout.paystack.com/demo-ewa-3f9a21",
          held_for_minutes: 30,
        },
      },
      {
        kind: "bot",
        text: "Thanks Tolu! Here's your payment link for *₦195,000*:\nhttps://checkout.paystack.com/demo-ewa-3f9a21\n\nYou can pay by card, bank transfer or USSD. The apartment is held for 30 minutes while you pay.",
        at: at(4),
      },
      { kind: "payment", reference: "EWA-3F9A21", amount: 195_000, at: at(7) },
      {
        kind: "bot",
        text: "Payment received, thank you Tolu! ✅\n\n*Booking EWA-3F9A21 is confirmed*\n1-bedroom, Lekki Phase 1\nSat 12 Dec → Tue 15 Dec (3 nights, 2 guests)\nPaid: ₦195,000\n\nCheck-in is from 2pm. We'll send the address and your host's number the day before. Please have the ₦50,000 refundable caution deposit ready to transfer at check-in.",
        at: at(7),
      },
    ],
  },
  {
    id: "handoff",
    label: "Hand over to host",
    blurb: "A request the bot can't confirm",
    pay: false,
    customer: [
      "Hello. Can you arrange an airport pickup from Murtala Muhammed for my stay?",
      "Okay, thanks. Is there parking at the apartment?",
    ],
    reference: [
      { kind: "customer", text: "Hello. Can you arrange an airport pickup from Murtala Muhammed for my stay?", at: at(0) },
      {
        kind: "tool",
        name: "hand_off_to_human",
        input: { summary: "Customer is asking whether we can arrange an airport pickup from Murtala Muhammed Airport." },
        output: { status: "Host notified. They usually reply within an hour, 8am to 8pm." },
      },
      {
        kind: "bot",
        text: "Hello! Airport pickup isn't something I can confirm here, so I've asked the host to get back to you. They usually reply within an hour, between 8am and 8pm.",
        at: at(0),
      },
      { kind: "customer", text: "Okay, thanks. Is there parking at the apartment?", at: at(2) },
      { kind: "bot", text: "Yes, every apartment comes with a dedicated parking space.", at: at(2) },
    ],
  },
];
