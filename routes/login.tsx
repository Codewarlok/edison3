import { Head } from "fresh/runtime";
import { authService } from "@/lib/auth/runtime.ts";
import { AUTH_COOKIE, SESSION_TTL_MS } from "@/lib/auth/service.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!email || !password) {
      return ctx.render({ error: "Completa email y contraseña" });
    }

    const login = await authService.login(email, password);
    if (!login) {
      return ctx.render({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const res = new Response(null, {
      status: 302,
      headers: {
        location: "/dashboard",
      },
    });

    res.headers.append(
      "set-cookie",
      `${AUTH_COOKIE}=${login.sessionId}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; SameSite=Lax`,
    );

    return res;
  },
});

export default define.page<typeof handler>(function LoginPage({ data, state }) {
  if (state.auth.user) {
    return (
      <div class="p-8">
        <p>Ya estás logueado como {state.auth.user.email}.</p>
        <a href="/dashboard" class="text-blue-600 underline">Ir al panel</a>
      </div>
    );
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Head>
        <title>Login | Edison</title>
      </Head>
      <form method="POST" class="bg-white border rounded-xl p-6 w-full max-w-md shadow-sm space-y-4">
        <h1 class="text-2xl font-bold">Login Edison</h1>
        {data?.error && <p class="text-red-600 text-sm">{data.error}</p>}
        <div>
          <label class="block text-sm mb-1">Email</label>
          <input name="email" type="email" class="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label class="block text-sm mb-1">Contraseña</label>
          <input name="password" type="password" class="w-full border rounded px-3 py-2" required />
        </div>
        <button type="submit" class="w-full bg-black text-white rounded px-3 py-2">Ingresar</button>
      </form>
    </div>
  );
});
