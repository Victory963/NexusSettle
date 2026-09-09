import type { FxQuote, NexusAsset } from "./types";

export class FxReject extends Error {}

const FIAT = new Set<NexusAsset>(["USD", "JPY"]);
const STABLES = new Set<NexusAsset>(["USDC", "USDT"]);

/** Mid rates in quote/base, 6-decimal atomic units on both sides. */
const MID: Record<string, number> = {
  "USDC/USD": 1,
  "USDT/USD": 1,
  "USDC/JPY": 150,
  "USDT/JPY": 150,
};

const DEFAULT_SPREAD_BPS = 15;
const DEPEG_HALT_BPS = 50;

function pairKey(from: NexusAsset, to: NexusAsset) {
  return `${from}/${to}`;
}

export function midRate(from: NexusAsset, to: NexusAsset): number {
  if (from === to) return 1;
  const direct = MID[pairKey(from, to)];
  if (direct) return direct;
  const inverse = MID[pairKey(to, from)];
  if (inverse) return 1 / inverse;
  throw new FxReject(`no mid rate for ${from}/${to}`);
}

export function observedDeviationBps(from: NexusAsset, to: NexusAsset, observedMid = midRate(from, to)) {
  const expected = midRate(from, to);
  return Math.round((Math.abs(observedMid - expected) / expected) * 10_000);
}

export function quoteFx(input: {
  fromAsset: NexusAsset;
  toAsset: NexusAsset;
  fromAmountAtomic: string;
  spreadBps?: number;
  observedMid?: number;
  licensedPartner?: boolean;
}): FxQuote {
  const amount = BigInt(input.fromAmountAtomic);
  if (amount <= 0n) throw new FxReject("quote amount must be positive");
  if (input.fromAsset === input.toAsset) throw new FxReject("from and to assets must differ");

  const crossesFiat = FIAT.has(input.fromAsset) || FIAT.has(input.toAsset);
  const crossesStable = STABLES.has(input.fromAsset) || STABLES.has(input.toAsset);
  if (!crossesFiat || !crossesStable) {
    throw new FxReject("quotes are limited to stablecoin ↔ fiat pairs");
  }

  const spreadBps = input.spreadBps ?? DEFAULT_SPREAD_BPS;
  const observed = input.observedMid ?? midRate(input.fromAsset, input.toAsset);
  const deviation = observedDeviationBps(input.fromAsset, input.toAsset, observed);
  const depegHalt = deviation > DEPEG_HALT_BPS;
  const rateAfterSpread = observed * (1 - spreadBps / 10_000);
  const toAmount = BigInt(Math.floor(Number(amount) * rateAfterSpread));

  return {
    fromAsset: input.fromAsset,
    toAsset: input.toAsset,
    fromAmountAtomic: amount.toString(),
    toAmountAtomic: toAmount.toString(),
    rate: rateAfterSpread.toString(),
    spreadBps,
    depegHalt,
    partnerRequired: true,
    executable: false,
  };
}

export function assertQuoteTradable(quote: FxQuote, licensedPartner: boolean) {
  if (quote.depegHalt) throw new FxReject(`${quote.fromAsset} depeg halt: spread exceeded ${DEPEG_HALT_BPS} bps`);
  if (!licensedPartner) throw new FxReject("fiat conversion requires a licensed MTL/card partner");
}
