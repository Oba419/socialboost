"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/hooks/use-api";
import { contactSchema, type ContactInput } from "./schema";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", website: "" },
  });
  const { register, handleSubmit, formState, reset } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    const res = await apiFetch<{ received: boolean }>("/api/contact", { method: "POST", json: values });
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Message sent. We'll get back to you soon.");
    reset();
    setSent(true);
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center py-10 text-center" role="status">
        <CheckCircle2 className="text-success size-10" />
        <h2 className="mt-4 text-lg font-semibold">Thanks for reaching out</h2>
        <p className="text-muted-foreground mt-1 text-sm">We&apos;ve received your message and will reply by email.</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject" error={errors.subject?.message} required>
        <Input id="subject" aria-invalid={!!errors.subject} {...register("subject")} />
      </Field>
      <Field label="Message" htmlFor="message" error={errors.message?.message} required>
        <Textarea id="message" rows={6} aria-invalid={!!errors.message} {...register("message")} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={formState.isSubmitting}>
        <Send className="size-4" /> {formState.isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
