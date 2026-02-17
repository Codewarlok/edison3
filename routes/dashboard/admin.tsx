import { define } from "@/utils.ts";
import { requireRole } from "@/lib/auth/guards.ts";

function AdminPage({ state }) {
  return (
    <main class="p-8">
      <h1 class="text-3xl font-bold">Bienvenido, Administrador</h1>
      <p class="mt-2">Hola {state.auth.user?.displayName}. Esta vista es exclusiva para rol admin.</p>
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    const guard = requireRole(ctx.state, "admin");
    if (guard) return guard;
    return ctx.render(<AdminPage state={ctx.state} url={ctx.url} params={ctx.params} />);
  },
});

export default define.page(AdminPage);
