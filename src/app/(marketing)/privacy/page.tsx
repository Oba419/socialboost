import { LegalPage } from "@/components/marketing/legal-page";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Privacy Policy", description: `How ${siteConfig.name} collects and protects your data.` };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="9 November 2026"
      sections={[
        {
          heading: "What we collect",
          body: (
            <p>
              Account details (name, email), the brand profile you provide during onboarding, content you create or
              save, and — when you connect a social account — the profile information and metrics the platform&apos;s
              official API makes available under the permissions you approve. Payment card details are handled by
              Paystack; we never see or store full card numbers.
            </p>
          ),
        },
        {
          heading: "What we never collect",
          body: <p>We never ask for or store your social media passwords, and we never access private data without an authorised connection.</p>,
        },
        {
          heading: "How we use AI",
          body: (
            <p>
              To generate content we send your request and relevant, non-sensitive brand context (such as niche and
              audience) to our AI provider. We do not send your credentials, access tokens or payment information.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              Data is isolated per account and workspace with database row-level security. Social access tokens and
              payment authorizations are encrypted at rest and never sent to your browser.
            </p>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <p>
              You can disconnect social accounts at any time, export your data, and delete your account from Settings.
              Deleting your account removes your profile, workspaces and content.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions? Email <a className="underline" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
