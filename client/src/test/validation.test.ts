import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePhone,
  validatePasswordStrength,
} from "../lib/validation";

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("name.surname@domain.co.uk")).toBe(true);
    expect(validateEmail("test+tag@gmail.com")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("noatsign")).toBe(false);
    expect(validateEmail("@nodomain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user @example.com")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(validateEmail("  user@example.com  ")).toBe(true);
  });
});

describe("validatePhone", () => {
  it("accepts empty string (optional field)", () => {
    expect(validatePhone("")).toBe(true);
  });

  it("accepts valid phone formats", () => {
    expect(validatePhone("+1234567890")).toBe(true);
    expect(validatePhone("123-456-7890")).toBe(true);
    expect(validatePhone("+44 20 7946 0958")).toBe(true);
    expect(validatePhone("(555) 123-4567")).toBe(true);
  });

  it("rejects too-short numbers", () => {
    expect(validatePhone("123")).toBe(false);
  });

  it("rejects strings with letters", () => {
    expect(validatePhone("abc1234567")).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("returns null for a strong password", () => {
    expect(validatePasswordStrength("StrongP1")).toBeNull();
    expect(validatePasswordStrength("MyPassword123")).toBeNull();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordStrength("Short1")).toContain("at least 8");
  });

  it("rejects passwords without uppercase", () => {
    expect(validatePasswordStrength("lowercase1")).toContain("uppercase");
  });

  it("rejects passwords without a digit", () => {
    expect(validatePasswordStrength("NoDigitHere")).toContain("number");
  });
});
