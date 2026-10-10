import type { Metadata } from 'next';
import { Download, Github, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { getPortfolioData } from '@/lib/portfolio-data';
export const metadata: Metadata = { title: 'Contact', description: 'Contact Safika Sultana about analytics, AI, and development opportunities.' };
export default async function ContactPage() {
  const { profile, content } = await getPortfolioData();
  const links = [{ label: 'Email', text: profile.email, href: `mailto:${profile.email}`, Icon: Mail }, { label: 'Phone', text: `+91 ${profile.phoneNumber}`, href: profile.phoneHref, Icon: Phone }, { label: 'GitHub', text: 'Explore my repositories', href: profile.githubUrl, Icon: Github }, { label: 'LinkedIn', text: 'Connect professionally', href: profile.linkedInUrl, Icon: Linkedin }, { label: 'CV', text: 'Download my CV', href: profile.cvUrl, Icon: Download }];
  return <main className="dashboard-page">
    <header><p className="eyebrow">Let’s work together</p><h1 className="text-[26px] leading-tight">Start a conversation.</h1><p className="mt-2 max-w-xl text-sm">Analytics, AI, and useful digital experiences. Share what you’re building.</p></header>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <section className="panel p-3 sm:p-4" aria-labelledby="contact-details"><h2 id="contact-details" className="dashboard-heading mb-3">Contact details</h2><div className="space-y-2">{links.map(({ label, text, href, Icon }) => href && <a key={label} href={href} target={label === 'GitHub' || label === 'LinkedIn' ? '_blank' : undefined} rel={label === 'GitHub' || label === 'LinkedIn' ? 'noopener noreferrer' : undefined} download={label === 'CV' || undefined} className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-accent"><Icon size={18} className="shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0"><span className="block text-[11px] text-secondary">{label}</span><span className="block break-words text-[13px]">{text}</span></span></a>)}</div><p className="mt-4 flex items-center gap-2 text-xs"><MapPin size={15} className="shrink-0 text-accent" aria-hidden="true" />{profile.location}</p>{!profile.cvUrl && <p className="mt-3 text-xs">CV download will appear when a file is published.</p>}</section>
      <section className="panel p-3 sm:p-4" aria-labelledby="message-title"><h2 id="message-title" className="dashboard-heading mb-3">Send a message</h2>{content.source !== 'database' && <p className="mb-4 rounded-lg border border-border bg-background p-3 text-xs">The message service is awaiting configuration. Please email <a href={`mailto:${profile.email}`} className="break-all text-accent underline">{profile.email}</a> or call directly.</p>}<ContactForm /></section>
    </div>
  </main>;
}
