import { ERC20_TRANSFER_TOPIC, checksum, sameAddr } from "./assets";
import type { EvmReceipt, HexAddress, PaymentProof } from "./types";

function topicAddress(topic: string): HexAddress {
  const hex = topic.toLowerCase().replace(/^0x/, "");
  return checksum(`0x${hex.slice(-40)}`);
}

function dataUint(data: string): bigint {
  const hex = data.toLowerCase().replace(/^0x/, "") || "0";
  return BigInt(`0x${hex}`);
}

export type TransferEvent = {
  token: HexAddress;
  from: HexAddress;
  to: HexAddress;
  value: bigint;
};

export function parseTransferEvents(receipt: EvmReceipt): TransferEvent[] {
  const events: TransferEvent[] = [];
  for (const log of receipt.logs) {
    if (!log.topics[0] || log.topics[0].toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
    if (log.topics.length < 3) continue;
    events.push({
      token: checksum(log.address),
      from: topicAddress(log.topics[1]),
      to: topicAddress(log.topics[2]),
      value: dataUint(log.data),
    });
  }
  return events;
}

/** Rejects lookalike tokens: contract address must match the canonical asset. */
export function verifyStableTransfer(
  receipt: EvmReceipt,
  expected: Pick<PaymentProof, "payTo" | "token" | "amountAtomic">,
): { ok: true; event: TransferEvent } | { ok: false; reason: string } {
  if (receipt.status !== 1) return { ok: false, reason: "Transaction failed or unconfirmed" };
  const events = parseTransferEvents(receipt);
  const match = events.find(
    (e) =>
      sameAddr(e.token, expected.token) &&
      sameAddr(e.to, expected.payTo) &&
      e.value >= BigInt(expected.amountAtomic),
  );
  if (!match) return { ok: false, reason: "Invalid USDC/USDT transfer event" };
  return { ok: true, event: match };
}

export function encodeTransferLog(params: {
  token: HexAddress;
  from: HexAddress;
  to: HexAddress;
  value: string;
}): { address: HexAddress; topics: string[]; data: string } {
  const pad = (addr: string) => `0x${addr.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;
  const valueHex = BigInt(params.value).toString(16).padStart(64, "0");
  return {
    address: checksum(params.token),
    topics: [ERC20_TRANSFER_TOPIC, pad(params.from), pad(params.to)],
    data: `0x${valueHex}`,
  };
}
