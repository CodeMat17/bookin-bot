import { getApartment, naira, nightsBetween, overlaps } from "./property";
import type { Store } from "./store";

const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * Marks a booking as paid and returns the WhatsApp confirmation to send. Called by
 * the Paystack webhook after the payment is verified. The message is a template,
 * not AI output, so the confirmation a guest relies on is always exact.
 */
export function confirmPayment(store: Store, reference: string, now: Date) {
  const booking = store.getBooking(reference);
  if (!booking) return null;
  if (booking.status === "paid") return { booking, message: null, conflict: false };

  // A late payment after the hold expired: someone else may have paid for these dates meanwhile.
  const conflict = store
    .bookings()
    .some((b) => b !== booking && b.status === "paid" && b.apartment_id === booking.apartment_id && overlaps([b.check_in, b.check_out], [booking.check_in, booking.check_out]));
  booking.status = "paid";
  booking.paid_at = now.toISOString();
  store.save();

  if (conflict) {
    const message = `Payment received for ${booking.reference}, thank you. Unfortunately those dates were booked by another guest after your 30-minute hold ran out. Our host will contact you shortly to move your dates or refund you in full.`;
    return { booking, message, conflict };
  }

  const apt = getApartment(booking.apartment_id)!;
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const message = [
    `Payment received, thank you ${booking.guest_name.split(" ")[0]}! ✅`,
    "",
    `*Booking ${booking.reference} is confirmed*`,
    `${apt.name}`,
    `${day(booking.check_in)} → ${day(booking.check_out)} (${nights} nights, ${booking.guests} guest${booking.guests > 1 ? "s" : ""})`,
    `Paid: ${naira(booking.amount)}`,
    "",
    "Check-in is from 2pm. We'll send the address and your host's number the day before. Please have the ₦50,000 refundable caution deposit ready to transfer at check-in.",
  ].join("\n");
  return { booking, message, conflict };
}
