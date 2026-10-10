import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Award, Code2, FolderGit2, Github, Mail, MapPin, Phone, ScanLine } from 'lucide-react';
import { PortraitCard } from '@/components/portrait-card';
import { SkillsFrame } from '@/components/skills-frame';
import { CardCarousel } from '@/components/card-carousel';
import { LazyPortfolioChart } from '@/components/lazy-portfolio-chart';
import { TimelineRecords } from '@/components/timeline-records';
import { ProjectIcon, SkillIcon } from '@/components/content-icons';
import { getPortfolioData } from '@/lib/portfolio-data';

export default async function HomePage() {
 const { profile, projects, skillGroups, content } = await getPortfolioData();
 const uniqueSkills = new Set(skillGroups.flatMap(group => group.skills)).size;
 const studies = projects.filter(project => project.published && Object.values(project.caseStudy || {}).some(Boolean)).length;
 const kpis = [
  {label:'Public repositories',value:projects.filter(project => project.url.startsWith('https://github.com/safika28/')).length,caption:projects.some(project => project.metadataSource==='github')?'GitHub · live metadata':'GitHub · saved inventory',Icon:FolderGit2,color:'text-accent'},
  {label:'Technologies & skills',value:uniqueSkills,caption:'Owner-listed toolkit',Icon:Code2,color:'text-leaf'},
  {label:'Published case studies',value:content.source==='database'?studies:'—',caption:studies?'Published CMS records':'Details awaiting publication',Icon:ScanLine,color:'text-mint'},
  {label:'Certifications',value:content.certifications.length,caption:'Documented course completions',Icon:Award,color:'text-sage'}
 ];
 const order = Array.isArray(content.settings?.featuredOrder) ? (content.settings.featuredOrder as string[]).map(name=>name.toLowerCase()) : [];
 const rank = (name:string) => { const index=order.indexOf(name.toLowerCase()); return index<0 ? Infinity : index; };
 const homeProjects = [...projects].sort((a,b)=>rank(a.name)-rank(b.name)||Number(b.featured===true)-Number(a.featured===true)||Number(b.sourceStatus==='available')-Number(a.sourceStatus==='available')||Number(Boolean(b.homepage))-Number(Boolean(a.homepage)));
 return <main className="dashboard-page">
  <section className="panel overflow-hidden p-3 sm:p-4" aria-labelledby="identity-title">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><p className="eyebrow mb-0">Analytics · AI · Development</p><span className="flex items-center gap-1.5 text-[10px] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Personal workspace</span></div>
   <div className="identity-grid">
    <PortraitCard photoUrl={profile.photoUrl} name={profile.name} linkedInUrl={profile.linkedInUrl} cvUrl={profile.cvUrl} />
    <div className="flex min-w-0 flex-col justify-center">
     <h1 id="identity-title" className="text-[26px] font-semibold leading-[1.06] sm:text-[32px] lg:text-[34px]">{profile.name}</h1>
     <p className="mt-2 text-[12px] font-medium text-accent sm:text-sm">{profile.title}</p>
     <p className="mt-3 text-[13px] leading-[1.55] sm:max-w-lg sm:text-[15px]">{profile.bio}</p>
     <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4"><MapPin size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />{profile.location}</p>
     {profile.availability&&<p className="mt-2 text-xs text-accent">{profile.availability}</p>}
     <div className="mt-4 hidden flex-wrap gap-2 sm:flex"><Link href="/projects" className="button-primary">View projects<ArrowRight size={14} aria-hidden="true" /></Link><a href={profile.phoneHref} className="button-secondary"><Phone size={14} aria-hidden="true" />Contact</a><a href={profile.githubUrl} className="button-secondary" target="_blank" rel="noopener noreferrer"><Github size={14} aria-hidden="true" />GitHub</a></div>
    </div>
   </div>
   <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden"><Link href="/projects" className="button-primary">View projects<ArrowRight size={14} aria-hidden="true" /></Link><a href={profile.phoneHref} className="button-secondary"><Phone size={14} aria-hidden="true" />Contact</a></div>
   <div className="mt-3 border-t border-border pt-3"><p className="text-[12px] font-medium text-primary">Insightful analysis. Thoughtful product execution.</p></div>
  </section>
  {content.settings?.showKpis !== false && <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4" aria-label="Portfolio overview">
   {kpis.map(({label,value,caption,Icon,color})=><div key={label} className="panel p-3"><div className="flex items-center justify-between gap-2"><span className="text-[11px] text-secondary">{label}</span><Icon size={15} className={color} aria-hidden="true" /></div><div className="mt-1.5 font-mono text-[25px] font-semibold leading-tight">{value}</div><p className="mt-1 text-[11px] leading-4">{caption}</p></div>)}
  </section>}
  <section id="skills" className="scroll-mt-20"><SkillsFrame groups={skillGroups.map(group=>({title:group.title,count:group.skills.length}))}>{skillGroups.map(group=><ul key={group.title} className="skills-chip-list">{group.skills.map(skill=><li key={skill} className="skill-badge"><SkillIcon label={skill} size={14} className="text-accent" />{skill}</li>)}</ul>)}</SkillsFrame><Link href="/skills" className="mt-1 flex min-h-11 items-center justify-end gap-1 text-xs text-accent">Explore all skills<ArrowRight size={13} aria-hidden="true" /></Link></section>
   <section id="work" className="panel scroll-mt-20 p-3 sm:p-4" aria-labelledby="selected-title"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="eyebrow">Projects</p><h2 id="selected-title" className="dashboard-heading">All projects</h2></div><Link href="/projects" className="flex min-h-11 items-center gap-1 text-xs text-accent">All {projects.length}<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    <CardCarousel label="All projects">{homeProjects.map(project=><Link key={project.name} data-repository={project.name} href={`/projects/${encodeURIComponent(project.name)}`} className="group flex min-h-40 min-w-0 flex-col rounded-lg border border-border bg-background/50 p-3 hover:border-accent/50"><span className="mb-2 self-start rounded-lg bg-accent/10 p-2 text-accent"><ProjectIcon name={project.name} size={18} /></span><h3 className="text-[13px] leading-5 group-hover:text-accent">{project.title}</h3><p className="mt-1 text-[11px]">{project.category}</p><p className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-accent">{project.sourceStatus==='available'?'Source available':project.sourceStatus==='empty'?'Awaiting source':'Explore repository'}<ArrowUpRight size={14} aria-hidden="true" /></p></Link>)}<Link href="/contact" className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-accent"><ArrowUpRight size={24} aria-hidden="true" />Let’s work together</Link></CardCarousel>
   </section>
  <LazyPortfolioChart projects={projects} />
  <section id="about" className="panel flex scroll-mt-20 items-start gap-3 p-3 sm:p-4"><Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" /><div className="min-w-0"><p className="eyebrow">About</p><h2 className="dashboard-heading">Clear data. Better decisions.</h2><p className="mt-1 text-[13px]">{profile.about}</p><Link href="/about" className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-accent">Meet Safika<ArrowRight size={13} aria-hidden="true" /></Link></div></section>
  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
   <section id="education" className="min-w-0 scroll-mt-20" aria-labelledby="home-education-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
     <div><p className="eyebrow">Academic background</p><h2 id="home-education-title" className="dashboard-heading">Education</h2></div>
     <Link href="/education" className="flex min-h-11 items-center gap-1 text-xs text-accent">Education page<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div>
    <TimelineRecords records={content.education} type="education" headingLevel={3} />
   </section>
   <section id="certifications" className="min-w-0 scroll-mt-20" aria-labelledby="home-certifications-title">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
     <div><p className="eyebrow">Credentials &amp; learning</p><h2 id="home-certifications-title" className="dashboard-heading">Certifications</h2></div>
     <Link href="/certifications" className="flex min-h-11 items-center gap-1 text-xs text-accent">Credentials page<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div>
    <TimelineRecords records={content.certifications} type="certifications" headingLevel={3} />
   </section>
  </div>
  <section id="experience" className="scroll-mt-20" aria-labelledby="home-experience-title">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div><p className="eyebrow">Career journey</p><h2 id="home-experience-title" className="dashboard-heading">Experience</h2></div>
    <Link href="/experience" className="flex min-h-11 items-center gap-1 text-xs text-accent">Career page<ArrowUpRight size={14} aria-hidden="true" /></Link>
   </div>
   <TimelineRecords records={content.experience} type="experience" headingLevel={3} />
  </section>
  <section id="contact" className="panel scroll-mt-20 p-3 sm:p-4" aria-labelledby="home-contact-title">
   <p className="eyebrow">Contact</p><h2 id="home-contact-title" className="dashboard-heading">Get in touch</h2>
   <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-3">
    <a href={`mailto:${profile.email}`} className="flex min-h-16 min-w-0 items-start gap-2 rounded-lg border border-border bg-elevated p-3 hover:border-accent"><Mail size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" /><span className="min-w-0"><span className="block text-[11px] text-secondary">Email</span><span className="block break-words text-[13px] text-primary">{profile.email}</span></span></a>
    <a href={profile.phoneHref} className="flex min-h-16 min-w-0 items-start gap-2 rounded-lg border border-border bg-elevated p-3 hover:border-accent"><Phone size={16} className="mt-0.5 shrink-0 text-leaf" aria-hidden="true" /><span className="min-w-0"><span className="block text-[11px] text-secondary">Call</span><span className="block break-words text-[13px] text-primary">+91 {profile.phoneNumber}</span></span></a>
    <div className="flex min-h-16 min-w-0 items-start gap-2 rounded-lg border border-border bg-elevated p-3"><MapPin size={16} className="mt-0.5 shrink-0 text-sage" aria-hidden="true" /><span className="min-w-0"><span className="block text-[11px] text-secondary">Location</span><span className="block break-words text-[13px] text-primary">{profile.location}</span></span></div>
   </div>
  </section>
 </main>;
}
