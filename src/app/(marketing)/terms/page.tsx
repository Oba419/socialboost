import { LegalPage } from "@/components/marketing/legal-page";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Terms of Service", description: `Terms for using ${siteConfig.name}.` };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="9 November 2026"
      sections={[
        {
          heading: "The service",
          body: (
            <p>
              {siteConfig.name} provides AI-assisted tools to plan, create, schedule and analyse social media content.
              Results depend on many factors outside our control; we do not guarantee follower growth, reach,
              engagement or sales.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              You agree not to use the service for spam, fake engagement, impersonation, harassment, or anything that
              violates the terms of the social platforms you connect. You are responsible for reviewing AI-generated
              content before publishing it.
            </p>
          ),
        },
        {
          heading: "Third-party platforms",
          body: (
            <p>
              Integrations rely on official third-party APIs, which may change, limit or withdraw functionality.
              Feature availability per platform may vary accordingly.
            </p>
          ),
        },
        {
          heading: "Subscriptions and billing",
          body: (
            <p>
              Paid plans are billed in advance for the chosen period via Paystack. Paid features are activated only
              after payment is verified. Downgrades and cancellations take effect at the end of the current period.
              AI credits reset each billing period and do not roll over.
            </p>
          ),
        },
        {
          heading: "Your content",
          body: <p>You own the content you create. You grant us the limited rights needed to store, process and display it to you and your team.</p>,
        },
        {
          heading: "Termination",
          body: <p>You may delete your account at any time. We may suspend accounts that violate these terms, with an audit record kept of the action.</p>,
        },
      ]}
    />
  );
}
