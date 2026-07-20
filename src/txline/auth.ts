import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import env from "@/config/env";

// TxLINE access flow (see the official examples/devnet reference):
//   1. POST /auth/guest/start           -> guest JWT
//   2. one-time on-chain subscribe(...)  -> src/txline/subscribe.ts (bootstrap)
//   3. POST /api/token/activate          -> long-lived apiToken
//   4. data calls send Authorization: Bearer <jwt> + X-Api-Token: <apiToken>,
//      renewing the JWT on 401.
//
// Credential precedence: env (TXLINE_JWT / TXLINE_API_TOKEN) beats the
// persisted data/txline-credentials.json written by the subscribe bootstrap.
// The hot path only needs steps 1 + 4. Native fetch, no axios.

interface PersistedCreds {
  jwt?: string;
  apiToken?: string;
}

function loadPersisted(): PersistedCreds {
  const file = join(process.cwd(), "data", "txline-credentials.json");
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // unreadable file = no persisted creds
  }
  return {};
}

export class TxlineAuth {
  jwt: string;
  apiToken: string;

  constructor() {
    const persisted = loadPersisted();
    this.jwt = env.TXLINE_JWT ?? persisted.jwt ?? "";
    this.apiToken = env.TXLINE_API_TOKEN ?? persisted.apiToken ?? "";
  }

  private get origin() {
    return env.TXLINE_API_ORIGIN;
  }

  /** Ensure we hold a JWT. Throws when TxLINE is unreachable. */
  async ensure(): Promise<void> {
    if (!this.jwt) await this.renewJwt();
    if (!this.apiToken) {
      throw new Error(
        "no TxLINE apiToken: run the one-time bootstrap (bun run src/txline/subscribe.ts) " +
          "or set TXLINE_API_TOKEN",
      );
    }
  }

  /** POST /auth/guest/start -> fresh guest JWT. Call on 401. */
  async renewJwt(): Promise<string> {
    const res = await fetch(`${this.origin}/auth/guest/start`, { method: "POST" });
    if (!res.ok) throw new Error(`guest/start failed: ${res.status}`);
    const body = (await res.json()) as { token: string };
    this.jwt = body.token;
    return this.jwt;
  }

  headers(): Record<string, string> {
    const h: Record<string, string> = {
      // The backend can answer zstd-compressed, which bun's fetch fails to
      // decode; ask for an uncompressed body.
      "Accept-Encoding": "identity",
    };
    if (this.jwt) h["Authorization"] = `Bearer ${this.jwt}`;
    if (this.apiToken) h["X-Api-Token"] = this.apiToken;
    return h;
  }

  /** GET with one automatic JWT renew on 401/403. */
  async apiGet(path: string): Promise<Response> {
    const url = `${this.origin}/api${path}`;
    let res = await fetch(url, { headers: this.headers() });
    if (res.status === 401 || res.status === 403) {
      await this.renewJwt();
      res = await fetch(url, { headers: this.headers() });
    }
    return res;
  }
}
