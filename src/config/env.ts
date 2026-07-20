import { ZodError, z } from "zod/v4";

// ---------------------------------------------------------------------------
// edgebot environment. Shape copied from jomo (CoreSchema + SecretsSchema,
// top-level await, Object.freeze) with all Infisical logic removed: we just
// parse process.env. This is the ONLY place process.env is read. Import the
// frozen default export everywhere else.
// ---------------------------------------------------------------------------

/** Non-secret flags, always read straight from process.env. */
const CoreSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  IS_PROD: z.boolean().default(false),
  IS_DEV: z.boolean().default(true),
});

/** Everything the agent needs to run. Devnet defaults are baked in so a fresh
 * clone runs the mock demo with an empty .env. */
const SecretsSchema = z.object({
  // App
  APP_NAME: z.string().default("edgebot"),

  // Solana (devnet). AGENT_KEYPAIR_SECRET is the agent's own signer as a JSON
  // array of the 64-byte secret key (Solana CLI keypair format). Optional: when
  // absent the executor uses an ephemeral keypair, which is fine for the mock
  // venue but NOT for proofsettle (that needs a funded devnet key).
  SOLANA_RPC: z.url().default("https://api.devnet.solana.com"),
  AGENT_KEYPAIR_SECRET: z.string().optional(),

  // TxLINE (consensus odds source). Devnet program + Token-2022 TxL mint.
  // TXLINE_JWT / TXLINE_API_TOKEN are optional pre-acquired creds; when both are
  // set the client skips the guest-start + on-chain subscribe + activate flow.
  TXLINE_API_ORIGIN: z.url().default("https://txline-dev.txodds.com"),
  TXLINE_PROGRAM_ID: z
    .string()
    .default("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  TXLINE_MINT: z.string().default("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  TXLINE_JWT: z.string().optional(),
  TXLINE_API_TOKEN: z.string().optional(),
  TXLINE_LEAGUES: z.string().default(""), // comma-separated league ids, "" = all permitted

  // Venue. "mock" is a self-contained in-memory book (default, always demoable).
  // "proofsettle" reads/writes proofsettle markets on devnet (skeleton).
  VENUE: z.enum(["mock", "proofsettle"]).default("mock"),
  PROOFSETTLE_PROGRAM_ID: z.string().optional(),
  PROOFSETTLE_BET_MINT: z.string().optional(),
  MOCK_EDGE: z.coerce.number().min(0).max(1).default(0.05), // how generous the mock book is vs fair, so the loop visibly fires

  // Strategy thresholds (all fractions of bankroll unless noted).
  START_BANKROLL: z.coerce.number().positive().default(1000), // bet-token units
  MIN_EDGE: z.coerce.number().min(0).max(1).default(0.03), // require >= 3% EV to bet
  KELLY_FRACTION: z.coerce.number().min(0).max(1).default(0.25), // quarter-Kelly
  PER_MATCH_CAP: z.coerce.number().min(0).max(1).default(0.1), // <=10% bankroll per match
  TOTAL_CAP: z.coerce.number().min(0).max(1).default(0.5), // <=50% bankroll total open
  MIN_STAKE: z.coerce.number().min(0).default(1),

  // Run mode. "replay" re-emits a recorded fixtures file deterministically.
  // DEMO=1 is the judge switch: forces replay mode and a fast tick so the
  // autonomous loop visibly runs within seconds, zero config needed.
  MODE: z.enum(["live", "replay"]).default("live"),
  DEMO: z.stringbool().default(false),
  // Runner tick interval override (ms). Unset = 60s live, 2s demo/replay.
  TICK_INTERVAL_MS: z.coerce.number().positive().optional(),
  REPLAY_FILE: z.string().default("fixtures/sample-worldcup.jsonl"),
  REPLAY_SPEED_MS: z.coerce.number().min(0).default(250), // gap between replayed ticks
  GRADE_INTERVAL_MS: z.coerce.number().min(1000).default(60000),

  // Where the JSONL decision/position/grade log lives.
  DATA_DIR: z.string().default("data"),
});

const EnvironmentSchema = CoreSchema.extend(SecretsSchema.shape);

export type EnvSchema = z.infer<typeof EnvironmentSchema>;

function initEnv(): Readonly<EnvSchema> {
  const core = CoreSchema.parse(process.env);
  const isProd = core.NODE_ENV === "production";

  try {
    const env = EnvironmentSchema.parse(process.env);
    env.IS_PROD = isProd;
    env.IS_DEV = !isProd;
    // DEMO is the judge switch: force the replay path everywhere (txline
    // facade, engine, runner interval) with a single flag.
    if (env.DEMO) env.MODE = "replay";
    return Object.freeze(env);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = new Error(z.prettifyError(error));
      validationError.stack = "";
      throw validationError;
    }
    console.error("Unexpected error during environment validation:", error);
    throw error;
  }
}

// Kept as top-level await to match jomo's contract (env resolves before any
// consumer imports it), even though parsing is now synchronous.
const env = await Promise.resolve(initEnv());

export default env;
