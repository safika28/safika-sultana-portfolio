import type { ReactNode } from 'react';
import { DashboardShell } from './dashboard-shell';
import { SiteFooter } from './site-footer';
import { getPortfolioData } from '@/lib/portfolio-data';
export async function SiteShell({ children }: { children: ReactNode }) {
 const { profile, content } = await getPortfolioData();
 const navigation = Array.isArray(content.settings?.navigation) ? content.settings.navigation as {label:string;href:string}[] : [];
 const workspaceTitle = typeof content.settings?.title === 'string' && content.settings.title.trim() ? content.settings.title.trim() : 'Analytics workspace';
 return <DashboardShell name={profile.name} workspaceTitle={workspaceTitle} navigation={navigation} footer={<SiteFooter profile={profile} />}>{children}</DashboardShell>;
}
