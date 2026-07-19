import env from "@/config/env";

// TxLINE access flow (see /tmp/tx-on-chain/examples/devnet for the reference):
//   1. POST /auth/guest/start           -> guest JWT
//   2. one-time on-chain subscribe(...)  -> see subscribe.ts (bootstrap, not here)
//   3. POST /api/token/activate          -> long-lived apiToken
//   4. data calls send Authorization: Bearer <jwt> + X-Api-Token: <apiToken>,
//      renewing the JWT on 401.
//
// edgebot's hot path only needs steps 1 + 4. If TXLINE_JWT and TXLINE_API_TOKEN
// are provided we skip acquisition entirely. Native fetch, no axios.

export class TxlineAuth {
  jwt = env.TXLINE_JWT ?? "";
  apiToken = env.TXLINE_API_TOKEN ?? "";

  private get origin() {
    return env.TXLINE_API_ORIGIN;
  }

  /** Ensure we hold a JWT (and, for real data, an apiToken). */
  async ensure(): Promise<void> {
    if (!this.jwt) await this.renewJwt();
    if (!this.apiToken) {
      console.warn(
        "[txline] no TXLINE_API_TOKEN set. Run the one-time subscribe bootstrap " +
          "(see src/txline/subscribe.ts) or paste a pre-acquired token into .env. " +
          "Snapshots/stream will 403 until then.",
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
    const h: Record<string, string> = {};
    if (this.jwt) h["Authorization"] = `Bearer ${this.jwt}`;
    if (this.apiToken) h["X-Api-Token"] = this.apiToken;
    return h;
  }

  /** GET with one automatic JWT renew on 401. */
  async apiGet(path: string): Promise<Response> {
    const url = `${this.origin}/api${path}`;
    let res = await fetch(url, { headers: this.headers() });
    if (res.status === 401) {
      await this.renewJwt();
      res = await fetch(url, { headers: this.headers() });
    }
    return res;
  }
}
