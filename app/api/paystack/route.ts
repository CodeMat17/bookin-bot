import { sendWhatsApp } from "@/lib/channels/twilio";
import { confirmPayment } from "@/lib/payments";
import { verifyTransaction, verifyWebhookSignature } from "@/lib/paystack";
import { FileStore } from "@/lib/store";

// Paystack calls this when a payment succeeds. We check the signature, confirm the
// payment with Paystack's API, mark the booking paid and message the guest.

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data: { reference: string } };
  if (event.event !== "charge.success") return new Response("ignored");

  const store = new FileStore();
  const booking = store.getBooking(event.data.reference);
  if (!booking) return new Response("unknown reference");

  const payment = await verifyTransaction(booking.reference);
  if (payment.status !== "success" || payment.amountKobo !== booking.amount * 100) {
    console.error("Payment did not verify", booking.reference, payment);
    return new Response("not verified");
  }

  const result = confirmPayment(store, booking.reference, new Date());
  if (result?.message) await sendWhatsApp(booking.phone, result.message);
  if (result?.conflict && process.env.HOST_WHATSAPP) {
    await sendWhatsApp(process.env.HOST_WHATSAPP, `Double booking: ${booking.reference} paid after its hold expired and the dates are taken. Please move or refund.`);
  }
  return new Response("ok");
}
