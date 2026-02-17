import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home({ state }) {
  return (
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>Nanaisoft | Edison</title>
      </Head>

      <header class="border-b border-slate-800">
        <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p class="font-bold text-xl">Nanaisoft</p>
            <p class="text-xs text-slate-400">Consultoría y desarrollo informático</p>
          </div>

          {state.auth.user
            ? (
              <a href="/dashboard" class="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg font-semibold">
                Entrar
              </a>
            )
            : (
              <a href="/login" class="bg-white text-slate-950 px-4 py-2 rounded-lg font-semibold">
                Login
              </a>
            )}
        </nav>
      </header>

      <main class="max-w-6xl mx-auto px-6 py-16">
        <h1 class="text-5xl font-black leading-tight max-w-3xl">
          Edison es nuestra solución de inteligencia de negocios para el mercado nacional.
        </h1>
        <p class="mt-6 text-slate-300 max-w-2xl text-lg">
          Construimos un data warehouse propio para análisis comercial,
          seguimiento por estado y toma de decisiones inteligentes.
        </p>
      </main>
    </div>
  );
});
