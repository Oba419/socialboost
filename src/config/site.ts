/**
 * Global brand configuration. Change the product name here (or via
 * NEXT_PUBLIC_APP_NAME) and it propagates across the entire application.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "SocialBoost AI",
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME || "SocialBoost",
  tagline: "Your Social Media Growth Starts Here.",
  description:
    "Create smarter content, understand your audience, manage every platform and grow your digital presence with one intelligent AI-powered platform.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  defaultCurrency: "NGN",
  defaultTimezone: "Africa/Lagos",
} as const;

export type SiteConfig = typeof siteConfig;
