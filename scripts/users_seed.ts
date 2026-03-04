import { KvAuthProvider } from "@/lib/auth/kv_provider.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import type { UserRole } from "@/lib/auth/types.ts";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  roles: UserRole[];
}

const seedUsers: SeedUser[] = [
  {
    email: "admin@edison.local",
    name: "Administrador",
    password: "admin123",
    roles: ["admin"],
  },
  {
    email: "analyst@edison.local",
    name: "Analista",
    password: "analyst123",
    roles: ["analyst"],
  },
];

const kv = await Deno.openKv();
const provider = new KvAuthProvider(kv);

try {
  for (const item of seedUsers) {
    const existing = await provider.getUserByEmail(item.email);
    if (!existing) {
      await provider.createUser({
        email: item.email,
        displayName: item.name,
        passwordHash: await hashPassword(item.password),
        roles: item.roles,
      });
      console.log(`created: ${item.email}`);
      continue;
    }

    await provider.updateUserRoles(existing.id, item.roles);
    console.log(`updated roles: ${item.email}`);
  }
} finally {
  kv.close();
}
