// Ewa Stays: a fictional short-let business in Lagos. Every apartment, price and
// booking here is made up. Prices are in naira; Paystack amounts are in kobo.

export const BUSINESS = "Ewa Stays";

export type Apartment = {
  id: string;
  name: string;
  area: string;
  maxGuests: number;
  nightly: number;
  /** Dates already taken, as [check-in, check-out) ranges in YYYY-MM-DD. */
  booked: [string, string][];
};

export const apartments: Apartment[] = [
  {
    id: "studio-lekki",
    name: "Studio, Lekki Phase 1",
    area: "Lekki Phase 1",
    maxGuests: 2,
    nightly: 45_000,
    booked: [["2026-12-10", "2026-12-14"], ["2026-12-24", "2026-12-28"]],
  },
  {
    id: "1bed-lekki",
    name: "1-bedroom, Lekki Phase 1",
    area: "Lekki Phase 1",
    maxGuests: 3,
    nightly: 65_000,
    booked: [["2026-12-18", "2026-12-22"]],
  },
  {
    id: "2bed-vi",
    name: "2-bedroom, Victoria Island",
    area: "Victoria Island",
    maxGuests: 5,
    nightly: 120_000,
    booked: [["2026-12-12", "2026-12-20"]],
  },
];

export const MIN_NIGHTS = 2;

/** House rules and policies the bot may quote. Anything not here goes to the host. */
export const POLICIES = `- Check-in is from 2pm and check-out is by 12 noon.
- Minimum stay is ${MIN_NIGHTS} nights.
- The full stay is paid online by card, bank transfer or USSD through Paystack when you book. The booking is held for 30 minutes while you pay.
- A refundable caution deposit of ₦50,000 is paid by bank transfer at check-in and returned within 48 hours of check-out if nothing is damaged.
- Every apartment has 24-hour power (inverter and generator), Wi-Fi, air conditioning, a fully equipped kitchen and a dedicated parking space.
- No parties or events. No smoking indoors.
- Cancellations made 7 or more days before check-in get a full refund. Cancellations made later are not refunded.`;

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

const DAY = 86_400_000;
export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY);

export const overlaps = (a: [string, string], b: [string, string]) => a[0] < b[1] && b[0] < a[1];

export function getApartment(id: string) {
  return apartments.find((a) => a.id === id);
}
