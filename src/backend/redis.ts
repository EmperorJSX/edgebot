import { createClient } from "redis";

// ponytail: single shared client + pubsub helper; extract to @emperorjs/projects/realtime later
export const redis = createClient({ url: process.env.REDIS_URL });

export async function publishInvalidation(topics: string[]) {
  if (!redis.isOpen) await redis.connect();
  await redis.publish("realtime:invalidations", JSON.stringify(topics));
}
