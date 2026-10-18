/** One step of a conversation, as shown in the demo. */
export type Step =
  | { kind: "customer"; text: string; at: string }
  | { kind: "bot"; text: string; at: string }
  | { kind: "tool"; name: string; input: Record<string, unknown>; output: Record<string, unknown> }
  | { kind: "payment"; reference: string; amount: number; at: string };

export type Transcript = {
  model: string;
  generated_at: string;
  /** Whether payment links came from Paystack test mode or were placeholders. */
  paystack: "test" | "mock";
  scenarios: Record<string, Step[]>;
};
