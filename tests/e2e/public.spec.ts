import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("homepage shows the hero and primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Social Media Growth Starts Here");
    await expect(page.getByRole("link", { name: /start growing/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore features/i }).first()).toBeVisible();
  });

  test("never shows fabricated testimonials or guarantees", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toMatch(/guaranteed (followers|growth|viral)/);
    expect(text).not.toMatch(/go viral guaranteed/);
  });

  test("pricing lists every plan with NGN prices", async ({ page }) => {
    await page.goto("/pricing");
    for (const name of ["Free", "Starter", "Creator Pro", "Business", "Agency"]) {
      await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText(/₦\s?5,000|NGN\s?5,000/).first()).toBeVisible();
  });

  test("features and about pages render", async ({ page }) => {
    await page.goto("/features");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("contact form validates input before submitting", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("mobile menu opens and links work", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: /menu|navigation/i }).first().click();
    await page.getByRole("link", { name: "Pricing" }).last().click();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("desktop nav reaches pricing", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "desktop only");
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/pricing/);
  });
});
