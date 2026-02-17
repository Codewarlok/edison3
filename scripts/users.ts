import { KvAuthProvider } from "@/lib/auth/kv_provider.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import type { UserRole } from "@/lib/auth/types.ts";

const kv = await Deno.openKv();
const provider = new KvAuthProvider(kv);

function usage() {
  console.log(`
Uso:
  deno run -A scripts/users.ts list
  deno run -A scripts/users.ts create --email=<email> --name=<nombre> --password=<clave> --roles=<admin|analyst|viewer[,..]>
  deno run -A scripts/users.ts update-roles --email=<email> --roles=<admin|analyst|viewer[,..]>
  deno run -A scripts/users.ts delete --email=<email>
  deno run -A scripts/users.ts seed-defaults
`);
}

function getFlag(name: string): string | null {
  const prefix = `--${name}=`;
  const found = Deno.args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function parseRoles(value: string | null): UserRole[] {
  if (!value) return ["viewer"];
  const out = value.split(",").map((v) => v.trim()).filter(Boolean) as UserRole[];
  for (const role of out) {
    if (!["admin", "analyst", "viewer"].includes(role)) {
      throw new Error(`Rol inválido: ${role}`);
    }
  }
  return out;
}

async function listUsers() {
  const users = await provider.listUsers();
  for (const user of users) {
    console.log(`${user.email} | roles=${user.roles.join(",")} | active=${user.isActive} | id=${user.id}`);
  }
}

async function createUser() {
  const email = getFlag("email");
  const name = getFlag("name") ?? "User";
  const password = getFlag("password");
  const roles = parseRoles(getFlag("roles"));

  if (!email || !password) throw new Error("Falta --email o --password");

  const passwordHash = await hashPassword(password);
  await provider.createUser({ email, displayName: name, passwordHash, roles });
  console.log(`Usuario creado: ${email}`);
}

async function updateRoles() {
  const email = getFlag("email");
  const roles = parseRoles(getFlag("roles"));
  if (!email) throw new Error("Falta --email");

  const user = await provider.getUserByEmail(email);
  if (!user) throw new Error("USER_NOT_FOUND");

  await provider.updateUserRoles(user.id, roles);
  console.log(`Roles actualizados para ${email}: ${roles.join(",")}`);
}

async function deleteUser() {
  const email = getFlag("email");
  if (!email) throw new Error("Falta --email");

  const user = await provider.getUserByEmail(email);
  if (!user) throw new Error("USER_NOT_FOUND");

  await provider.deleteUser(user.id);
  console.log(`Usuario eliminado: ${email}`);
}

async function seedDefaults() {
  const defaults = [
    { email: "admin@edison.local", name: "Administrador", password: "milanesadepollo", roles: ["admin"] as UserRole[] },
    { email: "analyst@edison.local", name: "Analista", password: "milanesa", roles: ["analyst"] as UserRole[] },
    { email: "visit@edison.local", name: "Visitante", password: "clave123", roles: ["viewer"] as UserRole[] },
  ];

  for (const item of defaults) {
    const existing = await provider.getUserByEmail(item.email);
    if (existing) {
      console.log(`Ya existe: ${item.email}`);
      continue;
    }

    const passwordHash = await hashPassword(item.password);
    await provider.createUser({
      email: item.email,
      displayName: item.name,
      passwordHash,
      roles: item.roles,
    });
    console.log(`Creado: ${item.email}`);
  }
}

const cmd = Deno.args[0];

try {
  switch (cmd) {
    case "list":
      await listUsers();
      break;
    case "create":
      await createUser();
      break;
    case "update-roles":
      await updateRoles();
      break;
    case "delete":
      await deleteUser();
      break;
    case "seed-defaults":
      await seedDefaults();
      break;
    default:
      usage();
      Deno.exit(1);
  }
} finally {
  kv.close();
}
