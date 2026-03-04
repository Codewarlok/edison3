import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home({ state }) {
  return (
    <div class="min-h-screen bg-base-100 text-base-content">
      <Head>
        <title>Nanaisoft | Edison BI</title>
      </Head>

      <header class="border-b border-base-300">
        <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p class="font-bold text-xl">Nanaisoft</p>
            <p class="text-xs text-base-content/70">
              SaaS BI + consultoría de datos y software
            </p>
          </div>

          <div class="flex items-center gap-3">
            <a
              href="#servicios"
              class="text-sm text-base-content/80 hover:text-base-content"
            >
              Servicios
            </a>
            {state.auth.user
              ? (
                <a
                  href="/dashboard"
                  class="bg-primary text-primary-content px-4 py-2 rounded-lg font-semibold"
                >
                  Ir al dashboard
                </a>
              )
              : (
                <a
                  href="/login"
                  class="bg-base-content text-base-100 px-4 py-2 rounded-lg font-semibold"
                >
                  Login
                </a>
              )}
          </div>
        </nav>
      </header>

      <main class="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <h1 class="text-4xl md:text-6xl font-black leading-tight max-w-4xl">
          Convierte licitaciones y operación comercial en decisiones de negocio
          en tiempo real.
        </h1>
        <p class="mt-6 text-base-content/80 max-w-2xl text-lg">
          Edison combina plataforma SaaS de Business Intelligence con
          consultoría especializada de Nanaisoft, para diseñar tableros
          ejecutivos, flujos de seguimiento y automatizaciones sobre tus datos.
        </p>

        <div class="mt-10 flex flex-wrap gap-3">
          <a
            href="/login"
            class="bg-primary text-primary-content px-5 py-3 rounded-lg font-semibold"
          >
            Probar Edison
          </a>
          <a
            href="#servicios"
            class="border border-base-300 px-5 py-3 rounded-lg font-semibold"
          >
            Ver capacidades
          </a>
        </div>

        <section id="servicios" class="mt-16 grid md:grid-cols-3 gap-4">
          <article class="rounded-xl border border-base-300 bg-base-200 p-5">
            <h2 class="font-bold">SaaS BI para licitaciones</h2>
            <p class="mt-2 text-sm text-base-content/80">
              Métricas de pipeline, estados y conversión en un solo panel.
            </p>
          </article>
          <article class="rounded-xl border border-base-300 bg-base-200 p-5">
            <h2 class="font-bold">Consultoría de datos</h2>
            <p class="mt-2 text-sm text-base-content/80">
              Modelamiento de data warehouse y gobernanza para escalar
              decisiones.
            </p>
          </article>
          <article class="rounded-xl border border-base-300 bg-base-200 p-5">
            <h2 class="font-bold">Implementación ágil</h2>
            <p class="mt-2 text-sm text-base-content/80">
              Integraciones, automatización y acompañamiento continuo por
              expertos.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
});
