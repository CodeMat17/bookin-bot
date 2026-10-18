import type Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type BookingStatus = "awaiting_payment" | "paid";

export type Booking = {
  reference: string;
  apartment_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  guest_email: string;
  phone: string;
  /** Total for the stay, in naira. */
  amount: number;
  status: BookingStatus;
  payment_url: string;
  created_at: string;
  paid_at?: string;
};

export type Conversation = {
  messages: Anthropic.Beta.BetaMessageParam[];
  handed_off: boolean;
};

type Data = { conversations: Record<string, Conversation>; bookings: Booking[] };

/** Unpaid bookings hold the apartment for this long. */
export const HOLD_MINUTES = 30;

/**
 * Conversation history and bookings. The in-memory store is used by the simulation
 * script; the file store backs the live bot when you run it locally behind a tunnel.
 * For a production deployment, swap in a database with the same methods.
 */
export class Store {
  protected data: Data = { conversations: {}, bookings: [] };

  conversation(id: string): Conversation {
    return (this.data.conversations[id] ??= { messages: [], handed_off: false });
  }

  bookings() {
    return this.data.bookings;
  }

  /** Bookings that currently block their dates: paid, or unpaid but still inside the hold window. */
  activeBookings(now: Date) {
    return this.data.bookings.filter(
      (b) => b.status === "paid" || now.getTime() - Date.parse(b.created_at) < HOLD_MINUTES * 60_000,
    );
  }

  addBooking(b: Booking) {
    this.data.bookings.push(b);
  }

  getBooking(reference: string) {
    return this.data.bookings.find((b) => b.reference === reference);
  }

  save() {}
}

export class FileStore extends Store {
  constructor(private path = "data/store.json") {
    super();
    if (existsSync(path)) this.data = JSON.parse(readFileSync(path, "utf8"));
  }

  save() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2) + "\n");
  }
}
