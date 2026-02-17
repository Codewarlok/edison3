import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!ctx.state.auth.user) {
      return Response.json({ authenticated: false }, { status: 401 });
    }
    return Response.json({ authenticated: true, user: ctx.state.auth.user });
  },
});
