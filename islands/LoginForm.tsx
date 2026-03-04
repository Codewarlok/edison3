import { useSignal } from "@preact/signals";

type Props = {
  action?: string;
  error?: string | null;
};

export default function LoginForm({ action = "/login", error }: Props) {
  const loading = useSignal(false);

  return (
    <form
      method="POST"
      action={action}
      class="bg-base-100 border border-base-300 rounded-xl p-6 w-full max-w-md shadow-sm space-y-4"
      onSubmit={() => {
        loading.value = true;
      }}
    >
      <h1 class="text-2xl font-bold">Login Edison</h1>
      <p class="text-sm text-base-content/70">
        Accede al dashboard según tu rol.
      </p>

      {error && (
        <p class="text-error text-sm rounded-md bg-error/10 px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <label class="block text-sm mb-1">Email</label>
        <input
          name="email"
          type="email"
          class="w-full border border-base-300 rounded px-3 py-2 bg-base-100"
          required
          disabled={loading.value}
        />
      </div>
      <div>
        <label class="block text-sm mb-1">Contraseña</label>
        <input
          name="password"
          type="password"
          class="w-full border border-base-300 rounded px-3 py-2 bg-base-100"
          required
          disabled={loading.value}
        />
      </div>
      <button
        type="submit"
        class="w-full bg-primary text-primary-content rounded px-3 py-2 disabled:opacity-70"
        disabled={loading.value}
      >
        {loading.value ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
