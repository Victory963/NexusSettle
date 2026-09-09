import { assertQuoteTradable, quoteFx } from "./fx";
import type { CardInstruction, FxQuote, PaymentIntent } from "./types";

export class CardRailReject extends Error {}

function licensedCardPartner() {
  return process.env.NEXUS_CARD_PARTNER_ENABLED === "true";
}

export function issueCardInstruction(input: {
  intent: PaymentIntent;
  quote: FxQuote;
  partner: CardInstruction["partner"];
}): CardInstruction {
  if (input.intent.source !== "card-quote" && input.intent.protocol !== "acp") {
    throw new CardRailReject("card instructions require a card-quote or ACP intent");
  }
  if (input.quote.depegHalt) {
    return {
      partner: input.partner,
      status: "blocked",
      reason: "depeg halt: card off-ramp paused",
      quote: input.quote,
      merchantRef: input.intent.resource,
      containsPan: false,
    };
  }
  if (!licensedCardPartner()) {
    return {
      partner: input.partner,
      status: "blocked",
      reason: "paper rail only: licensed Visa/Mastercard/ACP partner is not attached",
      quote: input.quote,
      merchantRef: input.intent.resource,
      containsPan: false,
    };
  }
  try {
    assertQuoteTradable(input.quote, true);
  } catch (error) {
    return {
      partner: input.partner,
      status: "blocked",
      reason: error instanceof Error ? error.message : "quote not tradable",
      quote: input.quote,
      merchantRef: input.intent.resource,
      containsPan: false,
    };
  }
  return {
    partner: input.partner,
    status: "paper",
    reason: "licensed partner is flagged, but this build never sends a live card authorization",
    quote: input.quote,
    merchantRef: input.intent.resource,
    containsPan: false,
  };
}

export function quoteCardOfframp(fromAmountAtomic: string, toAsset: "USD" | "JPY" = "USD") {
  return quoteFx({
    fromAsset: "USDC",
    toAsset,
    fromAmountAtomic,
    licensedPartner: licensedCardPartner(),
  });
}
