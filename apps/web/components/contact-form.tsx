'use client';
import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { contactSchema } from '@/lib/contact-validation';

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = contactSchema.safeParse(Object.fromEntries(new FormData(form).entries()));
    setNotice(null);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors(fields);
      const first = ['name', 'email', 'subject', 'message'].find((field) => fields[field as keyof typeof fields]);
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({}); setBusy(true);
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok) { setErrors(result.fields || {}); const first = ['name','email','subject','message'].find(field=>result.fields?.[field]); if(first)(form.elements.namedItem(first) as HTMLElement | null)?.focus(); throw new Error(result.error || 'Your message could not be sent. Please try email.'); }
      setNotice({ message: result.message, success: true }); form.reset();
    } catch (error) { setNotice({ message: error instanceof Error ? error.message : 'Messaging is unavailable. Please try email.', success: false }); }
    finally { setBusy(false); }
  }
  const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';
  return <form onSubmit={submit} noValidate className="space-y-3" aria-label="Send a collaboration message">
    <div className="grid gap-3 sm:grid-cols-2">{(['name', 'email'] as const).map((field) => <div key={field}><label htmlFor={`contact-${field}`} className="mb-1.5 block text-sm font-medium capitalize text-primary">{field}</label><input id={`contact-${field}`} name={field} type={field === 'email' ? 'email' : 'text'} autoComplete={field} required maxLength={field === 'email' ? 254 : 100} disabled={busy} className={inputClass} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `contact-${field}-error` : undefined} />{errors[field] && <p id={`contact-${field}-error`} className="mt-1 text-xs text-red-400">{errors[field]?.[0]}</p>}</div>)}</div>
    <div><label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-primary">Subject</label><input id="contact-subject" name="subject" required maxLength={160} disabled={busy} className={inputClass} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'contact-subject-error' : undefined} />{errors.subject && <p id="contact-subject-error" className="mt-1 text-xs text-red-400">{errors.subject[0]}</p>}</div>
    <div><label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-primary">Message</label><textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={5} disabled={busy} className={inputClass} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} />{errors.message && <p id="contact-message-error" className="mt-1 text-xs text-red-400">{errors.message[0]}</p>}</div>
    <div className="hidden" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    {notice && <p role={notice.success ? 'status' : 'alert'} className={`rounded-lg border p-3 text-sm ${notice.success ? 'border-emerald-400/30 text-emerald-300' : 'border-red-400/30 text-red-400'}`}>{notice.message}</p>}
    <button type="submit" disabled={busy} className="button-primary inline-flex min-h-11 items-center gap-2 px-4 disabled:opacity-60"><Send size={16} aria-hidden="true" />{busy ? 'Sending…' : 'Send message'}</button>
    <p className="text-xs text-secondary">Your name, email, and message are used to respond to your inquiry.</p>
  </form>;
}
