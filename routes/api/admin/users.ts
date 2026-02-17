import { authService } from "@/lib/auth/runtime.ts";
import type { UserRole } from "@/lib/auth/types.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.auth.user;
    if (!user || !authService.can(user, "users.read")) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const users = await authService.listUsers();
    return Response.json({ users });
  },

  async POST(ctx) {
    const user = ctx.state.auth.user;
    if (!user || !authService.can(user, "users.write")) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await ctx.req.json();
    const created = await authService.createUser({
      email: body.email,
      displayName: body.displayName,
      password: body.password,
      roles: (body.roles ?? ["viewer"]) as UserRole[],
    });

    return Response.json({ user: created }, { status: 201 });
  },
});
