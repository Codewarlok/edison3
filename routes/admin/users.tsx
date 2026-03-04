import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { requireRole } from "@/lib/auth/guards.ts";

export const handler = define.handlers({
  GET(ctx) {
    const guard = requireRole(ctx.state, "admin");
    if (guard) return guard;
    return ctx.render();
  },
});

export default define.page<typeof handler>(function AdminUsersPage({ state }) {
  return (
    <main class="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <Head>
        <title>Usuarios | Admin Edison</title>
      </Head>

      <div class="max-w-6xl mx-auto">
        <p class="text-xs uppercase tracking-widest text-slate-400">Administración</p>
        <h1 class="text-3xl font-black mt-2">Usuarios</h1>
        <p class="mt-3 text-slate-300">
          Base para gestión de usuarios del panel Edison. Sesión actual: {state.auth.user?.displayName}
        </p>

        <div class="mt-8 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table class="w-full text-left">
            <thead class="bg-slate-800/60 text-slate-300 text-sm">
              <tr>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} class="px-4 py-10 text-center text-slate-400">
                  Sin registros por ahora. Próximo paso: conectar esta tabla con <code>/api/admin/users</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
});
