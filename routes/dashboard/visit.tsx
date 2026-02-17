import { define } from "@/utils.ts";
import { requireRole } from "@/lib/auth/guards.ts";

function VisitPage({ state }) {
  return (
    <main class="p-8">
      <h1 class="text-3xl font-bold">Bienvenido, Visitante</h1>
      <p class="mt-2">Hola {state.auth.user?.displayName}. Esta vista es de lectura para rol viewer/visit.</p>
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    const guard = requireRole(ctx.state, "viewer");
    if (guard) return guard;
    return ctx.render(<VisitPage state={ctx.state} url={ctx.url} params={ctx.params} />);
  },
});

export default define.page(VisitPage);
