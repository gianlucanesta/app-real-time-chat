import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, BookOpen, ChevronDown } from "lucide-react";
import EphemeralBrand from "../components/ui/EphemeralBrand";
import { useState } from "react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
});

const FAQS = [
  {
    question: "How do I reset my password?",
    answer:
      'Go to the login page and click "Forgot?" next to the password field. Enter your email address and we\'ll send you a reset link. The link is valid for 1 hour.',
  },
  {
    question: "How do I verify my email address?",
    answer:
      "After signing up, check your inbox for a verification email from Ephemeral. Click the link in the email to verify your account. If you didn't receive it, check your spam folder or request a new one from the login page.",
  },
  {
    question: "Can I use Ephemeral on multiple devices?",
    answer:
      "Yes. Your account can be active across multiple devices simultaneously. All messages are synced in real time.",
  },
  {
    question: "How do I create or join a channel?",
    answer:
      'Once logged in, navigate to the Channels section in the sidebar. Use the "+" button to create a new channel, or use the search to find and join existing ones.',
  },
  {
    question: "How do voice and video calls work?",
    answer:
      "You can start a call from any direct message or channel. Calls use WebRTC for peer-to-peer encrypted communication. Make sure your browser has microphone and camera permissions enabled for the site.",
  },
  {
    question: "How do I change my display name or profile picture?",
    answer:
      "Go to Settings (gear icon in the sidebar) and navigate to the Profile section. From there you can update your display name, profile picture, and status.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Account deletion is available in Settings → Account → Delete Account. This action is permanent and will remove all your data within 30 days.",
  },
  {
    question: "Is my data encrypted?",
    answer:
      "All data is transmitted over TLS (HTTPS/WSS). Passwords are hashed and never stored in plain text. Message storage uses server-side encryption.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left text-text-main font-medium text-[15px] hover:bg-card/80 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary flex-shrink-0 ml-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <p className="px-5 pb-4 text-text-secondary text-[14px] leading-relaxed border-t border-border pt-3">
          {answer}
        </p>
      </div>
    </div>
  );
}

function SupportPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg text-text-main font-sans">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link to="/login" className="inline-block mb-8">
            <EphemeralBrand />
          </Link>
          <h1 className="text-3xl font-bold text-text-main mb-2">Support</h1>
          <p className="text-text-secondary text-[15px]">
            We're here to help. Find answers below or reach out to our team.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <a
            href="mailto:support@ephemeral.app"
            className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-[12px] hover:border-accent/50 transition-colors text-center group"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-text-main text-[14px]">
                Email Support
              </p>
              <p className="text-text-secondary text-[13px] mt-0.5">
                support@ephemeral.app
              </p>
            </div>
          </a>

          <a
            href="mailto:feedback@ephemeral.app"
            className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-[12px] hover:border-accent/50 transition-colors text-center group"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-text-main text-[14px]">
                Send Feedback
              </p>
              <p className="text-text-secondary text-[13px] mt-0.5">
                feedback@ephemeral.app
              </p>
            </div>
          </a>

          <a
            href="mailto:bugs@ephemeral.app"
            className="flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-[12px] hover:border-accent/50 transition-colors text-center group"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-text-main text-[14px]">
                Report a Bug
              </p>
              <p className="text-text-secondary text-[13px] mt-0.5">
                bugs@ephemeral.app
              </p>
            </div>
          </a>
        </div>

        {/* Response time notice */}
        <div className="bg-accent/5 border border-accent/20 rounded-[10px] px-5 py-4 mb-12 text-[14px] text-text-secondary">
          <strong className="text-text-main">Response time:</strong> Our support
          team typically responds within{" "}
          <strong className="text-text-main">24–48 hours</strong> on business
          days. For urgent issues, please include "URGENT" in your subject line.
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-text-main mb-5">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </div>

        {/* Still need help */}
        <div className="text-center bg-card border border-border rounded-[12px] px-6 py-8 mb-12">
          <h3 className="text-lg font-semibold text-text-main mb-2">
            Still need help?
          </h3>
          <p className="text-text-secondary text-[14px] mb-4">
            Can't find what you're looking for? Our support team is just an
            email away.
          </p>
          <a
            href="mailto:support@ephemeral.app"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-[14px] font-medium px-5 py-2.5 rounded-[8px] transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* Footer links */}
        <footer className="flex justify-center gap-4 sm:gap-5 text-[12px] text-text-secondary mt-4 pb-4 border-t border-border pt-6 w-full">
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
