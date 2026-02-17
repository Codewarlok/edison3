import { createDefine } from "fresh";
import type { PublicUser } from "@/lib/auth/types.ts";

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string;
  auth: {
    sessionId: string | null;
    user: PublicUser | null;
  };
}

export const define = createDefine<State>();
