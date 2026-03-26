import { createFileRoute, Link } from "@tanstack/react-router";
import EphemeralBrand from "../components/ui/EphemeralBrand";

export const Route = createFileRoute("/terms-of-service")({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg text-text-main font-sans">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link to="/login" className="inline-block mb-8">
            <EphemeralBrand />
          </Link>
          <h1 className="text-3xl font-bold text-text-main mb-2">
            Terms of Service
          </h1>
          <p className="text-text-secondary text-[14px]">
            Last updated: March 26, 2026
          </p>
        </div>

        <div className="flex flex-col gap-8 text-[15px] leading-relaxed text-text-secondary">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or accessing Ephemeral (the "Service"), you
              agree to be bound by these Terms of Service ("Terms"). If you do
              not agree to these Terms, you may not use the Service. These Terms
              apply to all visitors, users, and others who access or use the
              Service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              2. Description of Service
            </h2>
            <p>
              Ephemeral is a real-time messaging platform that allows users to
              communicate through text messages, voice calls, video calls, and
              file sharing within private and group channels. We reserve the
              right to modify, suspend, or discontinue the Service at any time
              without prior notice.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              3. Account Registration
            </h2>
            <p className="mb-3">To use the Service, you must:</p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>
                Be at least 13 years of age (or 16 in certain jurisdictions).
              </li>
              <li>Provide accurate and complete registration information.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>
                Promptly notify us of any unauthorized use of your account.
              </li>
              <li>
                Not create accounts using automated means or false information.
              </li>
            </ul>
            <p className="mt-3">
              You are responsible for all activity that occurs under your
              account.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              4. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside flex flex-col gap-2 pl-2">
              <li>
                Transmit any content that is unlawful, harmful, threatening,
                abusive, harassing, defamatory, or invasive of privacy.
              </li>
              <li>
                Impersonate any person or entity or misrepresent your
                affiliation.
              </li>
              <li>Send unsolicited messages, spam, or advertisements.</li>
              <li>Distribute malware, viruses, or any harmful code.</li>
              <li>
                Attempt to gain unauthorized access to any part of the Service
                or other users' accounts.
              </li>
              <li>
                Engage in any conduct that restricts or inhibits anyone's use or
                enjoyment of the Service.
              </li>
              <li>
                Violate any applicable local, national, or international laws or
                regulations.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              5. User Content
            </h2>
            <p className="mb-3">
              You retain ownership of the content you create and share through
              Ephemeral. By posting content, you grant us a non-exclusive,
              worldwide, royalty-free license to use, store, and process that
              content solely to provide and improve the Service.
            </p>
            <p>
              You are solely responsible for the content you transmit. We do not
              endorse any user content and reserve the right to remove content
              that violates these Terms.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content (excluding user content),
              features, and functionality are and will remain the exclusive
              property of Ephemeral and its licensors. Our trademarks and trade
              dress may not be used in connection with any product or service
              without the prior written consent of Ephemeral.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              7. Termination
            </h2>
            <p>
              We may terminate or suspend your account at our sole discretion,
              without prior notice or liability, for conduct that we believe
              violates these Terms or is harmful to other users, us, third
              parties, or the integrity of the Service. Upon termination, your
              right to use the Service will cease immediately.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              8. Disclaimers
            </h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis
              without warranties of any kind, either express or implied. We do
              not warrant that the Service will be uninterrupted, error-free, or
              free of harmful components. We make no warranty regarding the
              accuracy or reliability of any information obtained through the
              Service.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Ephemeral and its
              directors, employees, and agents shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages
              arising out of or relating to your use of, or inability to use,
              the Service — even if we have been advised of the possibility of
              such damages.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              10. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              applicable laws, without regard to conflict of law provisions. Any
              disputes arising under these Terms shall be resolved through
              binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              11. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              notify you of significant changes by updating the "Last updated"
              date or by sending an email notification. Continued use of the
              Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-semibold text-text-main mb-3">
              12. Contact
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@ephemeral.app"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                legal@ephemeral.app
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
