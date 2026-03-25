import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation on invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#email").blur();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("has a link to the signup page", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: /create one/i });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("Signup page", () => {
  test("renders the signup form", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();
    await expect(page.locator("#displayName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("shows password strength feedback", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#password").fill("abc");
    await page.locator("#password").blur();
    // Should show weak password indicator or error
    await expect(page.getByText(/password must|weak|at least/i)).toBeVisible();
  });

  test("has a link back to login", async ({ page }) => {
    await page.goto("/signup");
    const loginLink = page.getByRole("link", { name: /login/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Navigation & accessibility", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page has proper page title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/.+/);
  });

  test("toggle password visibility", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});
