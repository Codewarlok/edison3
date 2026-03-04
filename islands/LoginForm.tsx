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
      class="bg-white border rounded-xl p-6 w-full max-w-md shadow-sm space-y-4"
      onSubmit={() => {
        loading.value = true;
      }}
    >
      <h1 class="text-2xl font-bold">Login Edison</h1>
      <p class="text-sm text-slate-600">Accede al dashboard según tu rol.</p>

      {error && <p class="text-red-600 text-sm rounded-md bg-red-50 px-3 py-2">{error}</p>}

      <div>
        <label class="block text-sm mb-1">Email</label>
        <input name="email" type="email" class="w-full border rounded px-3 py-2" required disabled={loading.value} />
      </div>
      <div>
        <label class="block text-sm mb-1">Contraseña</label>
        <input
          name="password"
          type="password"
          class="w-full border rounded px-3 py-2"
          required
          disabled={loading.value}
        />
      </div>
      <button
        type="submit"
        class="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-70"
        disabled={loading.value}
      >
        {loading.value ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
