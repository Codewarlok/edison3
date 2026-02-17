import { KvAuthProvider } from "./kv_provider.ts";
import { AuthService } from "./service.ts";

const kv = await Deno.openKv();
const provider = new KvAuthProvider(kv);
export const authService = new AuthService(provider);

const bootstrapEmail = Deno.env.get("EDISON_ADMIN_EMAIL");
const bootstrapPassword = Deno.env.get("EDISON_ADMIN_PASSWORD");
const bootstrapName = Deno.env.get("EDISON_ADMIN_NAME") ?? "Admin";

if (bootstrapEmail && bootstrapPassword) {
  await authService.bootstrapAdmin(bootstrapEmail, bootstrapPassword, bootstrapName);
}
