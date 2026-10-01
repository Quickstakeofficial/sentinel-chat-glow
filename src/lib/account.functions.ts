import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "akinsanyaakinkunmi80@gmail.com";

export const ensureAccountAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    const metadata = context.claims.user_metadata;
    const displayName: string = metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>)["full_name"] === "string"
      ? String((metadata as Record<string, unknown>)["full_name"])
      : email.split("@")[0] || "Sentinel user";
    const isAdminEmail = email === ADMIN_EMAIL;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      display_name: displayName,
      access_status: isAdminEmail ? "approved" : "pending",
    }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: context.userId, role: isAdminEmail ? "admin" : "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
    if (roleError) throw new Error(roleError.message);

    return { email, displayName, isAdmin: isAdminEmail, status: isAdminEmail ? ("approved" as const) : ("pending" as const) };
  });
