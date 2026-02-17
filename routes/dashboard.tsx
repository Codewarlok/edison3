import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    const user = ctx.state.auth.user;
    if (!user) return new Response(null, { status: 302, headers: { location: "/login" } });

    if (user.roles.includes("admin")) {
      return new Response(null, { status: 302, headers: { location: "/dashboard/admin" } });
    }

    if (user.roles.includes("analyst")) {
      return new Response(null, { status: 302, headers: { location: "/dashboard/analyst" } });
    }

    return new Response(null, { status: 302, headers: { location: "/dashboard/visit" } });
  },
});
