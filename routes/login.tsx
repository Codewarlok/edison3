import { Head } from "fresh/runtime";
import { authService } from "@/lib/auth/runtime.ts";
import { AUTH_COOKIE, SESSION_TTL_MS } from "@/lib/auth/service.ts";
import { define } from "@/utils.ts";
import LoginForm from "@/islands/LoginForm.tsx";

function buildErrorRedirect(message: string) {
  return new Response(null, {
    status: 302,
    headers: { location: "/login?error=" + encodeURIComponent(message) },
  });
}

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const form = await ctx.req.formData();
      const email = String(form.get("email") ?? "").trim();
      const password = String(form.get("password") ?? "").trim();

      if (!email || !password) {
        return buildErrorRedirect("Completa email y contraseña");
      }

      const login = await authService.login(email, password);
      if (!login) {
        return buildErrorRedirect("Credenciales inválidas o usuario inactivo");
      }

      const res = new Response(null, {
        status: 302,
        headers: {
          location: "/dashboard",
        },
      });

      res.headers.append(
        "set-cookie",
        `${AUTH_COOKIE}=${login.sessionId}; HttpOnly; Path=/; Max-Age=${
          Math.floor(SESSION_TTL_MS / 1000)
        }; SameSite=Lax`,
      );

      return res;
    } catch (_error) {
      return buildErrorRedirect(
        "No pudimos autenticarte ahora. Intenta nuevamente en unos minutos.",
      );
    }
  },
});

export default define.page<typeof handler>(function LoginPage({ url, state }) {
  const error = url.searchParams.get("error");

  if (state.auth.user) {
    return (
      <div class="p-8 space-y-2">
        <p>Ya estás logueado como {state.auth.user.email}.</p>
        <a href="/dashboard" class="text-blue-600 underline">Ir al panel</a>
      </div>
    );
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-base-100 text-base-content p-4">
      <Head>
        <title>Login | Edison</title>
      </Head>
      <LoginForm error={error} />
    </div>
  );
});
