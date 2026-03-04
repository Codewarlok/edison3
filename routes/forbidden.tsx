import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";

export default define.page(function ForbiddenPage({ url, state }) {
  const required = url.searchParams.get("required");

  return (
    <main class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <Head>
        <title>Acceso denegado | Edison</title>
      </Head>
      <div class="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p class="text-sm uppercase tracking-widest text-red-300">Error 403</p>
        <h1 class="mt-2 text-3xl font-bold">Acceso denegado</h1>
        <p class="mt-4 text-slate-300">
          No tienes permisos para acceder a esta sección{required ? ` (rol requerido: ${required})` : ""}.
        </p>

        {state.auth.user && (
          <p class="mt-2 text-sm text-slate-400">
            Sesión activa: {state.auth.user.displayName} ({state.auth.user.email})
          </p>
        )}

        <div class="mt-8 flex gap-3">
          <a href="/dashboard" class="rounded-lg bg-white text-slate-900 px-4 py-2 font-semibold">Ir al dashboard</a>
          <a href="/" class="rounded-lg border border-slate-700 px-4 py-2">Volver al inicio</a>
        </div>
      </div>
    </main>
  );
});
