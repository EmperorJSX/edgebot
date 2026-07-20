// One-time TxLINE devnet bootstrap: pay for a subscription on-chain, then
// activate it against the backend to receive a long-lived API token.
//
//   bun run src/txline/subscribe.ts
//
// Flow (mirrors the official examples/devnet/scripts/subscription_free_tier.ts,
// rebuilt on gill instead of anchor since the instruction is a fixed shape):
//   1. POST /auth/guest/start                          -> guest JWT
//   2. ensure the payer's Token-2022 ATA for TxL exists (idempotent)
//   3. txoracle.subscribe(serviceLevelId=1, weeks=4)   -> tx signature
//      (service level 1 = World Cup + Int Friendlies, free tier, 0 TxL)
//   4. sign `${txSig}:${leagues.join(",")}:${jwt}` with the wallet key
//   5. POST /api/token/activate                        -> apiToken
//   6. persist { jwt, apiToken } to data/txline-credentials.json, which
//      TxlineAuth picks up automatically (env vars still win).
//
// The payer is the standard Solana CLI keypair (~/.config/solana/id.json) or
// TXLINE_WALLET if set. Needs a little devnet SOL for fees.

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  AccountRole,
  address,
  createSolanaClient,
  createTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  signBytes,
  signTransactionMessageWithSigners,
  type Instruction,
} from "gill";
import { loadKeypairSignerFromFile } from "gill/node";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
} from "gill/programs";
import env from "@/config/env";

// From the txoracle anchor IDL (examples/devnet/idl/txoracle.json).
const SUBSCRIBE_DISCRIMINATOR = new Uint8Array([254, 28, 191, 138, 156, 179, 183, 53]);
const SERVICE_LEVEL_ID = 1; // free World Cup tier on devnet
const WEEKS = 4; // must be a multiple of 4
const LEAGUES: number[] = []; // empty = standard free bundle

export const CREDENTIALS_FILE = join(process.cwd(), "data", "txline-credentials.json");

export interface StoredCredentials {
  jwt: string;
  apiToken: string;
  wallet: string;
  txSig: string;
  acquiredAt: string;
}

/** subscribe(service_level_id: u16, weeks: u8), little-endian per borsh. */
function subscribeData(): Uint8Array {
  const data = new Uint8Array(8 + 2 + 1);
  data.set(SUBSCRIBE_DISCRIMINATOR, 0);
  new DataView(data.buffer).setUint16(8, SERVICE_LEVEL_ID, true);
  data[10] = WEEKS;
  return data;
}

export async function subscribeAndActivate(): Promise<StoredCredentials> {
  const walletPath =
    process.env.TXLINE_WALLET ?? join(homedir(), ".config", "solana", "id.json");
  const signer = await loadKeypairSignerFromFile(walletPath);
  const programId = address(env.TXLINE_PROGRAM_ID);
  const mint = address(env.TXLINE_MINT);
  console.log(`[subscribe] wallet ${signer.address}, program ${programId}`);

  // 1. Guest JWT.
  const jwtRes = await fetch(`${env.TXLINE_API_ORIGIN}/auth/guest/start`, { method: "POST" });
  if (!jwtRes.ok) throw new Error(`guest/start failed: ${jwtRes.status}`);
  const { token: jwt } = (await jwtRes.json()) as { token: string };

  // 2. Derive every account the subscribe instruction touches.
  const [pricingMatrix] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: ["pricing_matrix"],
  });
  const [treasuryPda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: ["token_treasury_v2"],
  });
  const [userAta] = await findAssociatedTokenPda({
    owner: signer.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  const [treasuryVault] = await findAssociatedTokenPda({
    owner: treasuryPda,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  const createAta = getCreateAssociatedTokenIdempotentInstruction({
    payer: signer,
    owner: signer.address,
    mint,
    ata: userAta,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  // Account order is fixed by the IDL.
  const subscribeIx: Instruction = {
    programAddress: programId,
    accounts: [
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: pricingMatrix, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: userAta, role: AccountRole.WRITABLE },
      { address: treasuryVault, role: AccountRole.WRITABLE },
      { address: treasuryPda, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: address("11111111111111111111111111111111"), role: AccountRole.READONLY },
      { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: subscribeData(),
  };

  // 3. Send subscribe on devnet.
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: env.SOLANA_RPC,
  });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = createTransaction({
    version: "legacy",
    feePayer: signer,
    instructions: [createAta, subscribeIx],
    latestBlockhash,
  });
  const signed = await signTransactionMessageWithSigners(tx);
  const txSig = getSignatureFromTransaction(signed);
  await sendAndConfirmTransaction(signed, { commitment: "confirmed" });
  console.log(`[subscribe] on-chain subscribe confirmed: ${txSig}`);

  // 4. Wallet-sign the activation message. For LEAGUES = [] this signs
  //    `${txSig}::${jwt}` exactly as the docs specify.
  const message = new TextEncoder().encode(`${txSig}:${LEAGUES.join(",")}:${jwt}`);
  const sigBytes = await signBytes(signer.keyPair.privateKey, message);
  const walletSignature = Buffer.from(sigBytes).toString("base64");

  // 5. Activate to receive the API token.
  const actRes = await fetch(`${env.TXLINE_API_ORIGIN}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The backend can answer zstd-compressed, which bun's fetch fails to
      // decode; ask for an uncompressed body.
      "Accept-Encoding": "identity",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ txSig, walletSignature, leagues: LEAGUES }),
  });
  const actText = await actRes.text();
  if (!actRes.ok) {
    throw new Error(`token/activate failed: ${actRes.status} ${actText}`);
  }
  // The body is either { token } JSON or the bare token string.
  let apiToken = "";
  try {
    const parsed = JSON.parse(actText) as { token?: string } | string;
    apiToken = typeof parsed === "string" ? parsed : (parsed.token ?? "");
  } catch {
    apiToken = actText.trim();
  }
  if (!apiToken) throw new Error(`token/activate returned no token: ${actText}`);

  // 6. Persist for TxlineAuth.
  const creds: StoredCredentials = {
    jwt,
    apiToken,
    wallet: signer.address,
    txSig,
    acquiredAt: new Date().toISOString(),
  };
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
  console.log(`[subscribe] apiToken acquired and saved to ${CREDENTIALS_FILE}`);
  return creds;
}

// Bun sets import.meta.main when run directly; typed loosely because the
// project tsconfig targets the browser-ish Next runtime.
if ((import.meta as ImportMeta & { main?: boolean }).main) {
  subscribeAndActivate().catch((err) => {
    console.error("[subscribe] bootstrap failed:", err);
    process.exit(1);
  });
}
