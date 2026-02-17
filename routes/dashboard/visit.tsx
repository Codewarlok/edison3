import { define } from "@/utils.ts";
import { requireRole } from "@/lib/auth/guards.ts";

export const handler = define.handlers({
  GET(ctx) {
    const guard = requireRole(ctx.state, "viewer");
    if (guard) return guard;
    return ctx.render();
  },
});

export default define.page(function VisitPage({ state }) {
  return (
    <main class="p-8">
      <h1 class="text-3xl font-bold">Bienvenido, Visitante</h1>
      <p class="mt-2">Hola {state.auth.user?.displayName}. Esta vista es de lectura para rol viewer/visit.</p>
    </main>
  );
});
