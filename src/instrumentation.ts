// Next.js server hook: register() runs once per server instance, before it
// serves requests. This is what makes edgebot autonomous: the strategy loop
// starts with the server, no request or human input needed.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRunner } = await import("@/worker/runner");
    startRunner();
  }
}
