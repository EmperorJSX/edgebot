import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export const { signIn, signOut, useSession } = authClient;
// google sign-in: authClient.signIn.social({ provider: "google" })
