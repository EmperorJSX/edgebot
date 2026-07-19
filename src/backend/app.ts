import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono().basePath("/api");

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

const routes = app.get("/health", (c) => c.json({ ok: true }));

export type AppType = typeof routes;
export default app;
