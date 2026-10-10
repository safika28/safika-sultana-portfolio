'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, MailCheck } from 'lucide-react';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';

type AuthFormProps = {
  mode: 'login' | 'register';
  url: string | null;
  publicKey: string | null;
  configured: boolean;
  redirectTo?: string;
};

export function safeInternalRedirect(value: string | undefined): string {
  if (!value || value.length > 2048) return '/account';
  try {
    let decoded = value;
    for (let index = 0; index < 2; index += 1) decoded = decodeURIComponent(decoded);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return '/account';
    const parsed = new URL(decoded, 'https://portfolio.invalid');
    if (parsed.origin !== 'https://portfolio.invalid' || parsed.pathname.startsWith('//') || /^\/(?:login|register|auth|api)(?:\/|$)/.test(parsed.pathname)) return '/account';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return '/account'; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function AuthForm({ mode, url, publicKey, configured, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const client = useMemo(() => configured && url && publicKey ? getBrowserSupabaseClient(url, publicKey) : null, [configured, url, publicKey]);
  const registration = mode === 'register';
  const destination = safeInternalRedirect(redirectTo);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submission = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || submission.current) return;
    const form = event.currentTarget;
    const inputs = Array.from(form.elements).filter((element): element is HTMLInputElement => element instanceof HTMLInputElement);
    const invalid = inputs.filter((input) => !input.validity.valid);
    if (invalid.length) {
      setFieldErrors(Object.fromEntries(invalid.map((input) => [input.name, input.validationMessage])));
      setNotice('Please check the highlighted fields.');
      invalid[0]?.focus();
      return;
    }
    const values = new FormData(form);
    const password = String(values.get('password') ?? '');
    const username = String(values.get('username') ?? '').trim().toLowerCase();
    if (registration && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setFieldErrors({ username: 'Use 3–30 letters, numbers, or underscores.' });
      setNotice('Please check your username.');
      form.querySelector<HTMLInputElement>('[name="username"]')?.focus();
      return;
    }
    submission.current = true;
    setBusy(true);
    setNotice('');
    setFieldErrors({});
    try {
      if (registration) {
        const { data, error } = await client.auth.signUp({
          email: String(values.get('email') ?? '').trim(),
          password,
          options: { data: { username, full_name: username, app: 'safika_portfolio' }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw new Error('Registration could not be completed. Check your details or try again later.');
        form.reset();
        setShowPassword(false);
        if (data.session) router.replace('/account');
        else setConfirmation(true);
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: String(values.get('identifier') ?? '').trim(), password }),
          signal: AbortSignal.timeout(15_000), cache: 'no-store',
        });
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(isRecord(result) && typeof result.error === 'string' ? result.error.slice(0, 240) : 'Sign-in failed. Check your username or email and password.');
        const session = isRecord(result) && isRecord(result.session) ? result.session : null;
        if (!session || typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') throw new Error('Sign-in could not be completed. Please try again.');
        const { error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
        if (error) throw new Error('Your session could not be saved. Please sign in again.');
        form.reset();
        router.replace(destination);
      }
    } catch (error) {
      setNotice(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
        ? 'The request timed out. Please try again.'
        : error instanceof Error ? error.message : 'This request could not be completed. Please try again.');
    } finally {
      submission.current = false;
      setBusy(false);
    }
  }

  if (!client) return <section className="panel mx-auto max-w-md p-4 sm:p-5"><LockKeyhole size={22} className="text-accent" aria-hidden="true" /><h2 className="dashboard-heading mt-3">Account access is temporarily unavailable</h2><p className="mt-2 text-sm leading-6 text-secondary">You can continue exploring the portfolio or get in touch directly.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/projects" className="button-primary">Explore projects</Link><Link href="/contact" className="button-secondary">Contact</Link></div></section>;
  if (confirmation) return <section className="panel mx-auto max-w-md p-4 sm:p-5"><MailCheck size={24} className="text-mint" aria-hidden="true" /><h2 className="dashboard-heading mt-3">Check your email</h2><p className="mt-2 text-sm leading-6 text-secondary" role="status">Look for a confirmation link to finish registration. After confirming your email, you can sign in to your account.</p><Link href="/login" className="button-primary mt-4 inline-flex">Go to sign in<ArrowRight size={14} aria-hidden="true" /></Link></section>;

  const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60';
  const errorId = (name: string) => `${mode}-${name}-error`;
  return (
    <section className="panel mx-auto max-w-md p-4 sm:p-5">
      <form noValidate onSubmit={submit} className="space-y-3" aria-label={registration ? 'Create an account' : 'Sign in to your account'} aria-busy={busy}>
        {registration ? <>
          <div><label htmlFor="register-username" className="mb-1.5 block text-sm font-medium text-primary">Username</label><input id="register-username" name="username" type="text" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={busy} className={inputClass} aria-invalid={Boolean(fieldErrors.username)} aria-describedby={`username-help${fieldErrors.username ? ` ${errorId('username')}` : ''}`} /><p id="username-help" className="mt-1 text-xs text-secondary">3–30 letters, numbers, or underscores. Stored in lowercase.</p>{fieldErrors.username && <p id={errorId('username')} className="mt-1 text-xs text-danger">{fieldErrors.username}</p>}</div>
          <div><label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-primary">Email</label><input id="register-email" name="email" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" disabled={busy} className={inputClass} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? errorId('email') : undefined} />{fieldErrors.email && <p id={errorId('email')} className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}</div>
        </> : <div><label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-primary">Username or email</label><input id="login-identifier" name="identifier" type="text" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={busy} className={inputClass} aria-invalid={Boolean(fieldErrors.identifier)} aria-describedby={fieldErrors.identifier ? errorId('identifier') : undefined} />{fieldErrors.identifier && <p id={errorId('identifier')} className="mt-1 text-xs text-danger">{fieldErrors.identifier}</p>}</div>}
        <div><label htmlFor={`${mode}-password`} className="mb-1.5 block text-sm font-medium text-primary">Password</label><div className="relative"><input id={`${mode}-password`} name="password" type={showPassword ? 'text' : 'password'} required minLength={registration ? 10 : undefined} maxLength={256} autoComplete={registration ? 'new-password' : 'current-password'} disabled={busy} className={`${inputClass} pr-12`} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={`${registration ? 'password-help' : ''}${fieldErrors.password ? ` ${errorId('password')}` : ''}`.trim() || undefined} /><button type="button" onClick={() => setShowPassword((current) => !current)} disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-secondary hover:text-accent">{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div>{registration && <p id="password-help" className="mt-1 text-xs text-secondary">Use at least 10 characters.</p>}{fieldErrors.password && <p id={errorId('password')} className="mt-1 text-xs text-danger">{fieldErrors.password}</p>}</div>
        {notice && <p role="alert" className="rounded-lg border border-danger/30 p-3 text-sm text-danger">{notice}</p>}
        <button type="submit" disabled={busy} className="button-primary w-full disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}{busy ? (registration ? 'Creating account…' : 'Signing in…') : registration ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="mt-4 text-[13px] text-secondary">{registration ? 'Already have an account? ' : 'New here? '}<Link href={registration ? '/login' : '/register'} className="inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4">{registration ? 'Sign in' : 'Create an account'}</Link></p>
    </section>
  );
}
