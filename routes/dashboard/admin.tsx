import { define } from "@/utils.ts";
import { requireRole } from "@/lib/auth/guards.ts";

export const handler = define.handlers({
  GET(ctx) {
    const guard = requireRole(ctx.state, "admin");
    if (guard) return guard;
    return ctx.render();
  },
});

export default define.page(function AdminPage({ state }) {
  return (
    <main class="p-8">
      <h1 class="text-3xl font-bold">Bienvenido, Administrador</h1>
      <p class="mt-2">Hola {state.auth.user?.displayName}. Esta vista es exclusiva para rol admin.</p>
    </main>
  );
});
