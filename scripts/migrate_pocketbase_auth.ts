import { KvAuthProvider } from "@/lib/auth/kv_provider.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import type { UserRole } from "@/lib/auth/types.ts";

interface PocketBaseAuthRow {
  id: string;
  email: string;
  name?: string;
  created?: string;
  updated?: string;
  role?: UserRole;
}

function getFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const found = Deno.args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const input = getFlag("input");
const dryRun = getFlag("dry-run") !== "false";

if (!input) {
  console.error(
    "Uso: deno run -A --unstable-kv scripts/migrate_pocketbase_auth.ts --input=./tmp/pb-auth.json [--dry-run=true]",
  );
  Deno.exit(1);
}

const raw = await Deno.readTextFile(input);
const rows = JSON.parse(raw) as PocketBaseAuthRow[];

const kv = await Deno.openKv();
const provider = new KvAuthProvider(kv);

let created = 0;
let skipped = 0;

try {
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }

    const existing = await provider.getUserByEmail(email);
    if (existing) {
      skipped++;
      continue;
    }

    if (dryRun) {
      created++;
      continue;
    }

    await provider.createUser({
      email,
      displayName: row.name?.trim() || email,
      passwordHash: await hashPassword(crypto.randomUUID()),
      roles: [row.role ?? "viewer"],
    });
    created++;
  }

  console.log(
    `migrate_pocketbase_auth: dryRun=${dryRun} rows=${rows.length} created=${created} skipped=${skipped}`,
  );
  if (dryRun) {
    console.log(
      "Modo dry-run activo. Ejecuta con --dry-run=false para escribir en DenoKV.",
    );
  }
} finally {
  kv.close();
}
