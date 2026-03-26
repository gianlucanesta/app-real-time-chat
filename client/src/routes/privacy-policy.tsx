import { createFileRoute, Link } from "@tanstack/react-router";
import EphemeralBrand from "../components/ui/EphemeralBrand";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg text-text-main font-sans">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link to="/login" className="inline-block mb-8">
            <EphemeralBrand />
          </Link>
          <h1 className="text-3xl font-bold text-text-main mb-2">
            Privacy Policy
          </h1>
          <p className="text-text-secondary text-[14px]">
            Last updated: March 26, 2026
          </p>
        </div>

        <div className="flex flex-col gap-8 text-[15px] leading-relaxed text-text-secondary">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              1. Introduction
            </h2>
            <p>
              Welcome to Ephemeral ("we", "our", "us"). We are committed to
              protecting your personal information and your right to privacy.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our messaging application.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information you provide directly to us, such as:
            </p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>
                <strong className="text-text-main">Account information:</strong>{" "}
                name, email address, phone number, and password when you create
                an account.
              </li>
              <li>
                <strong className="text-text-main">Messages:</strong> content of
                messages, files, and media you send through the platform.
              </li>
              <li>
                <strong className="text-text-main">Profile data:</strong>{" "}
                profile pictures, display names, and status messages.
              </li>
              <li>
                <strong className="text-text-main">Usage data:</strong> how you
                interact with features, the channels you join, and timestamps of
                activity.
              </li>
              <li>
                <strong className="text-text-main">Device information:</strong>{" "}
                IP address, browser type, operating system, and device
                identifiers.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>
                Provide, operate, and maintain the Ephemeral messaging service.
              </li>
              <li>Authenticate your identity and secure your account.</li>
              <li>Process and deliver messages between users in real time.</li>
              <li>
                Send you transactional emails (e.g., email verification,
                password reset).
              </li>
              <li>
                Monitor and analyze usage patterns to improve the service.
              </li>
              <li>Detect and prevent fraud, abuse, and security incidents.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              4. Sharing of Information
            </h2>
            <p className="mb-3">
              We do not sell, trade, or rent your personal information to third
              parties. We may share your information only in the following
              limited circumstances:
            </p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>
                <strong className="text-text-main">Service providers:</strong>{" "}
                third-party vendors who assist us in operating the platform
                (e.g., cloud hosting, email delivery).
              </li>
              <li>
                <strong className="text-text-main">Legal compliance:</strong>{" "}
                when required by law, court order, or governmental authority.
              </li>
              <li>
                <strong className="text-text-main">Business transfers:</strong>{" "}
                in connection with a merger, acquisition, or sale of assets,
                with appropriate notice to you.
              </li>
              <li>
                <strong className="text-text-main">With your consent:</strong>{" "}
                for any other purposes with your explicit consent.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              5. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active
              or as needed to provide you with our services. You may delete your
              account at any time from the Settings page. Upon deletion, we will
              remove your personal information from our active databases within
              30 days, subject to legal retention requirements.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              6. Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              information, including TLS encryption in transit, hashed
              passwords, and access controls. However, no method of transmission
              over the Internet is 100% secure. We encourage you to use a
              strong, unique password and to enable any available security
              features.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              7. Your Rights
            </h2>
            <p className="mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate or incomplete data.</li>
              <li>
                Request deletion of your personal data ("right to be
                forgotten").
              </li>
              <li>Object to or restrict the processing of your data.</li>
              <li>
                Data portability — receive your data in a structured,
                machine-readable format.
              </li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:privacy@ephemeral.app"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                privacy@ephemeral.app
              </a>
              .
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              8. Cookies
            </h2>
            <p>
              We use cookies and similar tracking technologies to maintain your
              session and preferences. You can control cookie settings through
              your browser; however, disabling cookies may affect the
              functionality of the service.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes via email or through a notice on
              the application. Continued use of the service after changes
              constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at{" "}
              <a
                href="mailto:privacy@ephemeral.app"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                privacy@ephemeral.app
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer links */}
        <footer className="flex justify-center gap-4 sm:gap-5 text-[12px] text-text-secondary mt-12 pb-4 border-t border-border pt-6 w-full">
          <Link
            to="/privacy-policy"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Terms of Service
          </Link>
          <Link
            to="/support"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Support
          </Link>
        </footer>
      </div>
    </div>
  );
}
