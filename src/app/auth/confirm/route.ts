import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/features/auth/redirect";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Token-hash confirmation endpoint (use in Supabase email templates:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/auth/error?reason=not_configured`);
  if (!tokenHash || !type || !OTP_TYPES.includes(type)) return NextResponse.redirect(`${origin}/auth/error?reason=invalid_link`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(`${origin}/auth/error?reason=link_expired`);

  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"), "/onboarding")}`);
}
