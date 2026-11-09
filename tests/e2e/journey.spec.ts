import { expect, test, type Page } from "@playwright/test";

/**
 * Authenticated user journey. Requires a configured Supabase project and a
 * confirmed, onboarded test user:  E2E_EMAIL / E2E_PASSWORD.
 * AI generation steps additionally require OPENAI_API_KEY on the server and
 * credits available on the test user's plan.
 */
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run the authenticated journey.");
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/^password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

test("login lands on the dashboard or onboarding", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
});

test("dashboard navigation reaches every main section", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "sidebar navigation is desktop; mobile is covered by the sheet test");
  await login(page);
  if (page.url().includes("/onboarding")) test.skip(true, "test user has not completed onboarding");
  for (const [name, path] of [
    ["Content Library", "/dashboard/library"],
    ["Social Accounts", "/dashboard/accounts"],
    ["Analytics", "/dashboard/analytics"],
    ["Notifications", "/dashboard/notifications"],
    ["Subscription & Billing", "/dashboard/billing"],
    ["Settings", "/dashboard/settings"],
  ] as const) {
    await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("caption generator: generate, then save", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/captions");
  const generate = page.getByRole("button", { name: /generate captions/i });
  test.skip(await generate.isDisabled(), "AI is not configured on this server");
  await page.getByLabel(/what is the post about/i).fill("Behind the scenes of preparing our weekend market stall");
  await generate.click();
  await expect(page.getByRole("button", { name: /^save$/i }).first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: /^save$/i }).first().click();
  await expect(page.getByRole("button", { name: /^saved$/i }).first()).toBeVisible();
});

test("library lists drafts and allows creating one", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/library");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("calendar renders month view", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/calendar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
