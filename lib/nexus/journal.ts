import type {
  AccountKind,
  JournalAccount,
  JournalEntry,
  JournalPosting,
  NexusAsset,
  NexusNetwork,
} from "./types";

export class JournalReject extends Error {}

export type LedgerBook = {
  accounts: Map<string, JournalAccount>;
  entries: JournalEntry[];
  postings: JournalPosting[];
};

export function emptyBook(): LedgerBook {
  return { accounts: new Map(), entries: [], postings: [] };
}

export function accountKey(agentId: string, asset: NexusAsset, network: NexusNetwork, kind: AccountKind) {
  return `${agentId}:${asset}:${network}:${kind}`;
}

export function ensureAccount(
  book: LedgerBook,
  agentId: string,
  asset: NexusAsset,
  network: NexusNetwork,
  kind: AccountKind,
): JournalAccount {
  const id = accountKey(agentId, asset, network, kind);
  const existing = book.accounts.get(id);
  if (existing) return existing;
  const created: JournalAccount = {
    id,
    agentId,
    asset,
    network,
    kind,
    balance: 0n,
    version: 0,
  };
  book.accounts.set(id, created);
  return created;
}

function assertBalanced(postings: Array<Pick<JournalPosting, "asset" | "amount">>) {
  let total = 0n;
  const byAsset = new Map<NexusAsset, bigint>();
  for (const posting of postings) {
    total += posting.amount;
    byAsset.set(posting.asset, (byAsset.get(posting.asset) ?? 0n) + posting.amount);
  }
  if (total !== 0n) throw new JournalReject(`unbalanced journal entry: ${total}`);
  for (const [asset, sum] of byAsset) {
    if (sum !== 0n) throw new JournalReject(`unbalanced ${asset} leg: ${sum}`);
  }
}

function apply(account: JournalAccount, amount: bigint) {
  const next = account.balance + amount;
  if (next < 0n && account.kind !== "platform_clearing") {
    throw new JournalReject(`insufficient balance on ${account.id}`);
  }
  account.balance = next;
  account.version += 1;
}

export function findEntry(book: LedgerBook, extRef: string) {
  return book.entries.find((entry) => entry.extRef === extRef);
}

export function postBalanced(input: {
  book: LedgerBook;
  extRef: string;
  memo: string;
  legs: Array<{
    agentId: string;
    asset: NexusAsset;
    network: NexusNetwork;
    kind: AccountKind;
    amount: bigint;
  }>;
}): JournalEntry {
  const existing = findEntry(input.book, input.extRef);
  if (existing) return existing;
  if (!input.extRef) throw new JournalReject("extRef is required");
  assertBalanced(input.legs);

  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    extRef: input.extRef,
    memo: input.memo,
    createdAt: Date.now(),
  };

  for (const leg of input.legs) {
    const account = ensureAccount(input.book, leg.agentId, leg.asset, leg.network, leg.kind);
    apply(account, leg.amount);
    input.book.postings.push({
      id: crypto.randomUUID(),
      entryId: entry.id,
      accountId: account.id,
      asset: leg.asset,
      amount: leg.amount,
    });
  }

  input.book.entries.push(entry);
  return entry;
}

export function fundAccount(book: LedgerBook, agentId: string, asset: NexusAsset, network: NexusNetwork, amount: bigint) {
  return postBalanced({
    book,
    extRef: `fund:${agentId}:${asset}:${network}:${amount}`,
    memo: "Opening balance from platform clearing",
    legs: [
      { agentId: "CLEARING", asset, network, kind: "platform_clearing", amount: -amount },
      { agentId, asset, network, kind: "user", amount },
    ],
  });
}

export function postTransfer(input: {
  book: LedgerBook;
  extRef: string;
  payer: string;
  payee: string;
  asset: NexusAsset;
  network: NexusNetwork;
  amount: bigint;
  memo: string;
}): JournalEntry {
  if (input.amount <= 0n) throw new JournalReject("transfer amount must be positive");
  return postBalanced({
    book: input.book,
    extRef: input.extRef,
    memo: input.memo,
    legs: [
      { agentId: input.payer, asset: input.asset, network: input.network, kind: "user", amount: -input.amount },
      { agentId: input.payee, asset: input.asset, network: input.network, kind: "user", amount: input.amount },
    ],
  });
}

export function balances(book: LedgerBook) {
  return Object.fromEntries(
    [...book.accounts.values()].map((account) => [
      account.id,
      { agentId: account.agentId, asset: account.asset, kind: account.kind, balance: account.balance.toString() },
    ]),
  );
}
