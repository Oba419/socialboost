"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export async function switchWorkspace(organizationId: string) {
  return action(async () => {
    const id = z.string().uuid().parse(organizationId);
    const ctx = await requireApiUser();
    const supabase = await createClient();
    // The DB trigger also rejects orgs the user isn't a member of.
    const { error } = await supabase.from("profiles").update({ current_organization_id: id }).eq("id", ctx.userId);
    if (error) throw new AppError("FORBIDDEN", "You don't have access to that workspace.");
    revalidatePath("/dashboard", "layout");
    return { organizationId: id };
  });
}
