import { expect, test } from "@playwright/test";

test.describe("authentication pages", () => {
  test("login page renders a sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("protected dashboard is not accessible when signed out", async ({ page }) => {
    await page.goto("/dashboard");
    // With Supabase configured the proxy redirects to /login; without it the
    // app renders an explicit setup notice. Either way no dashboard data shows.
    const redirected = /\/login/.test(page.url());
    if (!redirected) {
      await expect(page.getByText(/awaiting setup/i)).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    }
  });

  test("admin console is not accessible when signed out", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/total users/i)).toHaveCount(0);
  });
});
