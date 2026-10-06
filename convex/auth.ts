import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString } from "@oslojs/crypto/random";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

const emailOTP = Email({
  id: "email-otp", maxAge: 15 * 60,
  async generateVerificationToken() {
    return generateRandomString({ read: bytes => { const random = new Uint8Array(bytes.length); crypto.getRandomValues(random); bytes.set(random); } }, "0123456789", 6);
  },
  async sendVerificationRequest({ identifier: email, token }, ctx?: ActionCtx) {
    const key = process.env.AUTH_RESEND_KEY;
    const from = process.env.AUTH_EMAIL_FROM;
    if (!key || !from || !ctx || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email delivery is unavailable.");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
    const emailHash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
    if (!await ctx.runMutation(internal.login.reserveEmail, { emailHash })) throw new Error("Please wait before requesting another code.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ from, to: [email], subject: "Your health record sign-in code",
        text: `Your sign-in code is ${token}.\n\nIt expires in 15 minutes. If you did not request this email, you can ignore it.\n\nThis email contains no health information.` }),
    });
    // Do not log the email address, code, credentials or provider response.
    if (!response.ok) throw new Error("Email delivery failed. Try again.");
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOTP], signIn: { maxFailedAttempsPerHour: 5 },
});
