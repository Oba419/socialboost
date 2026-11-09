import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/features/auth/redirect";

/**
 * OAuth (Google) and email-link (PKCE) callback. Exchanges the code for a
 * session cookie and redirects to a validated same-site path.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/dashboard");

  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/auth/error?reason=not_configured`);

  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(`${origin}/auth/error?reason=provider&message=${encodeURIComponent(providerError.slice(0, 200))}`);
  }
  if (!code) return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/auth/error?reason=link_expired`);

  // Users who haven't finished onboarding go there first (password reset excepted).
  if (next !== "/reset-password" && !next.startsWith("/onboarding")) {
    const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", data.user.id).maybeSingle();
    if (profile && !profile.onboarding_completed) return NextResponse.redirect(`${origin}/onboarding`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
