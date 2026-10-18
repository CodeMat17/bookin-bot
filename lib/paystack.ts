import { createHmac, timingSafeEqual } from "node:crypto";

// Paystack in test mode: payment links are real Paystack checkout pages that accept
// test cards, and no real money moves. Docs: https://paystack.com/docs/api/transaction/

const API = "https://api.paystack.co";

const secret = () => process.env.PAYSTACK_SECRET_KEY;

export const paystackMode = () => (secret()?.startsWith("sk_test_") ? "test" : secret() ? "live" : "mock");

/** Creates a checkout link. Without a key, returns a placeholder link so the flow can still be simulated. */
export async function createPaymentLink(input: {
  email: string;
  amountNaira: number;
  reference: string;
  metadata: Record<string, string>;
}): Promise<{ url: string; mock: boolean }> {
  if (!secret()) return { url: `https://checkout.paystack.com/demo-${input.reference.toLowerCase()}`, mock: true };

  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      currency: "NGN",
      reference: input.reference,
      metadata: input.metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(`Paystack initialize failed: ${json.message ?? res.status}`);
  return { url: json.data.authorization_url, mock: false };
}

/** Webhooks are signed with HMAC-SHA512 of the raw body, keyed by the secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!secret() || !signature) return false;
  const expected = createHmac("sha512", secret()!).update(rawBody).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Double-checks a payment with Paystack before trusting a webhook. */
export async function verifyTransaction(reference: string) {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(`Paystack verify failed: ${json.message ?? res.status}`);
  return { status: json.data.status as string, amountKobo: json.data.amount as number };
}
