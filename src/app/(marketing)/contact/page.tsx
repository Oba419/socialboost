import { Mail, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/marketing/section";
import { ContactForm } from "@/features/contact/contact-form";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Contact",
  description: `Get in touch with the ${siteConfig.name} team.`,
};

export default function ContactPage() {
  return (
    <div className="bg-hero-glow">
      <Section
        as="h1"
        eyebrow="Contact"
        title="We'd love to hear from you"
        description="Questions about plans, integrations or your account? Send us a message."
      >
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <ContactForm />
            </CardContent>
          </Card>
          <aside className="space-y-4">
            <div className="bg-card rounded-2xl border p-6">
              <Mail className="text-primary size-5" />
              <h2 className="mt-3 font-semibold">Email</h2>
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-muted-foreground hover:text-foreground mt-1 block text-sm break-all underline-offset-4 hover:underline">
                {siteConfig.supportEmail}
              </a>
            </div>
            <div className="bg-card rounded-2xl border p-6">
              <MessageCircle className="text-primary size-5" />
              <h2 className="mt-3 font-semibold">Existing customers</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Sign in first so we can link your message to your account and help faster.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </div>
  );
}
