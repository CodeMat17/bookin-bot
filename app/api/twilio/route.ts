import { handleMessage } from "@/lib/bot";
import { sendWhatsApp, verifyTwilioSignature } from "@/lib/channels/twilio";
import { FileStore } from "@/lib/store";
import { after } from "next/server";

// Incoming WhatsApp messages from Twilio. Twilio waits at most 15 seconds for a
// response, so we acknowledge at once and send the replies after the model is done.

export const maxDuration = 60;

export async function POST(request: Request) {
  const params = Object.fromEntries(
    [...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]),
  );
  const url = `${process.env.PUBLIC_URL?.replace(/\/$/, "")}/api/twilio`;
  if (!verifyTwilioSignature(url, params, request.headers.get("x-twilio-signature"))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const from = params.From;
  const text = params.Body?.trim();
  if (from && text) {
    after(async () => {
      const store = new FileStore();
      try {
        const { replies, steps } = await handleMessage(text, { store, conversationId: from, phone: from, now: new Date() });
        for (const reply of replies) await sendWhatsApp(from, reply);

        const handoff = steps.find((s) => s.kind === "tool" && s.name === "hand_off_to_human");
        if (handoff?.kind === "tool" && process.env.HOST_WHATSAPP) {
          await sendWhatsApp(process.env.HOST_WHATSAPP, `Handover from ${from.replace("whatsapp:", "")}: ${handoff.input.summary}`);
        }
      } catch (error) {
        console.error(error);
        await sendWhatsApp(from, "Sorry, something went wrong on our side. A member of the team will reply shortly.");
      }
    });
  }

  return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
