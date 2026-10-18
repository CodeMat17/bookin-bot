# WhatsApp Booking Bot

An AI booking demo: customers message on WhatsApp, and the bot checks availability, takes the booking, sends a Paystack payment link, logs the booking, and hands over to a person when a request falls outside the business's policies. It's a lab project for [matthewchukwu.dev](https://matthewchukwu.dev).

The business is fictional: Ewa Stays, three short-let apartments in Lagos. Every apartment, price and booking is made up.

## How it stays free to host

The public site makes **no AI calls** and needs no WhatsApp, Paystack or Twilio account. Visitors watch a conversation replayed from a real run of the bot (`data/transcript.json`), with the tool calls, the Paystack payment and the bookings table updating alongside it.

## How it works

- **`lib/bot.ts`: the bot.** It doesn't know about WhatsApp. A channel passes in a message, and the bot returns the replies to send. Claude decides what to do through three tools: `check_availability`, `create_booking` and `hand_off_to_human`. Dates, prices, holds and payment amounts are all computed in code, never by the model.
- **`lib/paystack.ts`: payments.** It creates checkout links, verifies webhook signatures and re-checks each payment with Paystack before trusting it. A booking is held for 30 minutes while the guest pays. If a payment arrives after the hold expired and someone else has taken the dates, the guest and host are both told.
- **`lib/payments.ts`: confirmation.** It marks the booking paid and sends a fixed template message, so the details a guest relies on are always exact.
- **`lib/channels/twilio.ts`: WhatsApp.** It verifies Twilio's signature and sends messages. Twilio's sandbox lets you test on a real phone without a Meta account. For a client, the same code works with their own WhatsApp Business number on Twilio.
- **`lib/store.ts`: storage.** Conversations and bookings, held in memory for the simulation and in `data/store.json` for local live runs. Swap in a database for production.

| Route | What it is |
| --- | --- |
| `/` | The public demo |
| `/api/twilio` | Incoming WhatsApp messages (Twilio webhook) |
| `/api/paystack` | Payment confirmations (Paystack webhook) |
| `/bookings` | Live bookings log for local runs |

## Scripts

```bash
yarn dev        # local dev server
yarn simulate   # run the real bot over the scripted conversations
yarn build
```

## 1. Generate the saved conversation (before launch)

Until you run this, the demo shows a hand-written reference conversation, labelled "Reference conversation · model run pending".

1. Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY`.
2. Optional but better: create a free [Paystack](https://paystack.com) account and add your **test** secret key (`sk_test_...`) as `PAYSTACK_SECRET_KEY`. The payment links in the transcript will then be real Paystack test links. Without it, placeholder links are used. The script refuses to run with a live key.
3. Run `yarn simulate`. It costs a few cents and prints the whole conversation, including every tool call.
4. Read it. If the bot asked for something the scripted customer didn't give, adjust the messages in `lib/scenarios.ts` and run it again.
5. Commit `data/transcript.json` and deploy.

The payment step in the simulation goes through the same `confirmPayment()` the Paystack webhook uses. Only the webhook call itself is simulated.

## 2. Run it on a real phone (for the case-study video)

This runs locally behind a tunnel, so the bookings file persists. You need a Twilio account and a public URL for your machine, for example from `cloudflared tunnel --url http://localhost:3000` or ngrok.

1. Start the app with `yarn dev` and start your tunnel. Set `PUBLIC_URL` in `.env.local` to the tunnel URL, then restart `yarn dev`.
2. In the Twilio console, open *Messaging → Try it out → Send a WhatsApp message*. From your phone, send the join code to the sandbox number.
3. In the sandbox settings, set *When a message comes in* to `<PUBLIC_URL>/api/twilio` (POST).
4. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_WHATSAPP_FROM` (the sandbox number, e.g. `whatsapp:+14155238886`) to `.env.local`. Optionally set `HOST_WHATSAPP` to your own number to receive handovers. In the sandbox, that number must also have joined.
5. In the Paystack dashboard (test mode), set the webhook URL to `<PUBLIC_URL>/api/paystack`.
6. Message the bot, pay the link with a [Paystack test card](https://paystack.com/docs/payments/test-payments/), and watch the confirmation arrive and `/bookings` update.

> The Twilio and Paystack webhook code is checked against their documented signature examples, but it has not yet been run end-to-end against live sandbox accounts. Expect to debug a first run.
