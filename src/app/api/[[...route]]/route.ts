import app from "@/backend/app";
import { handle } from "hono/vercel";

const handleApp = handle(app);

export {
  handleApp as GET,
  handleApp as POST,
  handleApp as PATCH,
  handleApp as PUT,
  handleApp as DELETE,
};
