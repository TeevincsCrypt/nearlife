/**
 * NEAR interactions.
 *
 * - Read-only RPC (native NEAR balance of any account, NEP-245 view calls) works with no config.
 * - Optional on-chain settlement: when NEAR_OPERATOR_ACCOUNT_ID, NEAR_OPERATOR_PRIVATE_KEY and
 *   NEP245_CONTRACT_ID are set, every NEP-245 event produced by the game ledger is replayed
 *   against the NEP-245 contract by the game operator account:
 *     mt_transfer -> mt_transfer(receiver_id, token_id, amount, approval: [owner_id, 0], memo)
 *     mt_mint     -> mt_mint(owner_id, token_ids, amounts)          (contract-owner method)
 *     mt_burn     -> mt_burn(owner_id, token_ids, amounts)          (contract-owner method)
 *   The operator must be the contract owner and an approved account for player tokens
 *   (NEP-245 approval management). Players never sign anything: gameplay stays instant and the
 *   chain receives the same transfers asynchronously.
 */
import { Account, JsonRpcProvider } from "near-api-js";
import type { LoggedNep245Event } from "./types";

export const NEAR_NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet";
export const NEAR_RPC_URL =
  process.env.NEAR_RPC_URL || (NEAR_NETWORK === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org");
export const NEP245_CONTRACT_ID = process.env.NEP245_CONTRACT_ID || "";

const OPERATOR_ID = process.env.NEAR_OPERATOR_ACCOUNT_ID || "";
const OPERATOR_KEY = process.env.NEAR_OPERATOR_PRIVATE_KEY || "";

export const settlementMode: "ledger" | "onchain" = OPERATOR_ID && OPERATOR_KEY && NEP245_CONTRACT_ID ? "onchain" : "ledger";

export function explorerTxUrl(hash: string) {
  return NEAR_NETWORK === "mainnet" ? `https://nearblocks.io/txns/${hash}` : `https://testnet.nearblocks.io/txns/${hash}`;
}

export function explorerAccountUrl(accountId: string) {
  return NEAR_NETWORK === "mainnet" ? `https://nearblocks.io/address/${accountId}` : `https://testnet.nearblocks.io/address/${accountId}`;
}

export type Network = "testnet" | "mainnet";

const RPC: Record<Network, string> = {
  testnet: NEAR_NETWORK === "testnet" ? NEAR_RPC_URL : "https://rpc.testnet.near.org",
  mainnet: NEAR_NETWORK === "mainnet" ? NEAR_RPC_URL : "https://rpc.mainnet.near.org",
};
const providers: Partial<Record<Network, JsonRpcProvider>> = {};
function getProvider(network: Network = NEAR_NETWORK as Network) {
  return (providers[network] ??= new JsonRpcProvider({ url: RPC[network] ?? NEAR_RPC_URL }));
}

export function explorerFor(network: Network) {
  return network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";
}

/** Latest block and gas price straight from NEAR RPC. */
export async function getNetworkStatus(network: Network = NEAR_NETWORK as Network) {
  const p = getProvider(network);
  const [status, gas] = await Promise.all([p.viewNodeStatus(), p.viewGasPrice()]);
  const s = status as unknown as { chain_id: string; sync_info: { latest_block_height: number; latest_block_time: string; latest_block_hash: string } };
  return {
    network,
    chainId: s.chain_id,
    blockHeight: s.sync_info.latest_block_height,
    blockTime: s.sync_info.latest_block_time,
    blockHash: s.sync_info.latest_block_hash,
    gasPrice: String((gas as unknown as { gas_price: string | bigint }).gas_price),
    explorer: explorerFor(network),
  };
}

/** Native NEAR balance (yoctoNEAR string). Throws if the RPC itself is unreachable. */
export async function getNativeBalance(accountId: string, network: Network = NEAR_NETWORK as Network): Promise<{ exists: boolean; yocto: string }> {
  try {
    const view = await getProvider(network).viewAccount({ accountId });
    return { exists: true, yocto: String(view.amount) };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/does not exist|UNKNOWN_ACCOUNT/i.test(msg)) return { exists: false, yocto: "0" };
    throw e;
  }
}

export function formatNear(yocto: string, digits = 4) {
  const v = BigInt(yocto || "0");
  const whole = v / 10n ** 24n;
  const frac = (v % 10n ** 24n).toString().padStart(24, "0").slice(0, digits);
  return `${whole}.${frac}`;
}

/** Replay ledger events on-chain. Returns one receipt per event. */
export async function settleEvents(events: LoggedNep245Event[]) {
  if (settlementMode !== "onchain" || events.length === 0) return [];
  const operator = new Account(OPERATOR_ID, NEAR_RPC_URL, OPERATOR_KEY as `ed25519:${string}`);
  const receipts: Array<{ seq: number; txHash?: string; error?: string }> = [];
  // Oldest first so balances line up.
  for (const { seq, event } of [...events].sort((a, b) => a.seq - b.seq)) {
    const d = event.data[0];
    try {
      let methodName: string;
      let args: Record<string, unknown>;
      let deposit = 0n;
      if (event.event === "mt_transfer") {
        methodName = "mt_transfer";
        args = {
          receiver_id: d.new_owner_id,
          token_id: d.token_ids[0],
          amount: d.amounts[0],
          approval: [d.old_owner_id, 0],
          memo: d.memo ?? null,
        };
        deposit = 1n; // NEP-245 requires exactly 1 yoctoNEAR on transfers
      } else {
        methodName = event.event; // mt_mint | mt_burn
        args = { owner_id: d.owner_id, token_ids: d.token_ids, amounts: d.amounts, memo: d.memo ?? null };
      }
      const res = await operator.callFunctionRaw({
        contractId: NEP245_CONTRACT_ID,
        methodName,
        args,
        deposit,
        gas: 30_000_000_000_000n,
      });
      receipts.push({ seq, txHash: res.transaction?.hash ?? res.transaction_outcome?.id });
    } catch (e) {
      receipts.push({ seq, error: (e as Error).message.slice(0, 200) });
    }
  }
  return receipts;
}
