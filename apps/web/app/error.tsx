'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="dashboard-page"><section className="panel p-5"><h1 className="dashboard-heading">The workspace couldn’t load.</h1><p className="my-3 text-sm">Try loading this page again.</p><div className="flex flex-wrap gap-2"><button onClick={reset} className="button-primary">Try again</button><Link href="/" className="button-secondary">Go home</Link></div></section></main>; }
