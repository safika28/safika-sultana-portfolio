'use client';

type Section = 'profile'|'skills'|'projects'|'experience'|'education'|'certifications'|'posts'|'settings';
type Kind = 'text'|'textarea'|'email'|'url'|'list'|'checkbox'|'select';
type Field = { key:string; label:string; kind?:Kind; required?:boolean; options?:string[] };
const fields:Record<Section,Field[]> = {
  profile: [
    {key:'name',label:'Name',required:true},{key:'title',label:'Professional title',required:true},{key:'bio',label:'Short introduction',kind:'textarea',required:true},{key:'about',label:'About',kind:'textarea'},
    {key:'location',label:'Location'},{key:'email',label:'Email',kind:'email'},{key:'phoneNumber',label:'Display phone number'},{key:'phoneHref',label:'Dial link (tel:+91…) '},
    {key:'linkedInUrl',label:'LinkedIn URL',kind:'url'},{key:'githubUrl',label:'GitHub URL',kind:'url'},{key:'cvUrl',label:'Real CV file URL or local path'},{key:'photoUrl',label:'Portrait URL or local path'},{key:'availability',label:'Availability statement'},
  ],
  skills:[{key:'title',label:'Category name',required:true},{key:'skills',label:'Skills — one per line',kind:'list',required:true},{key:'description',label:'Category description',kind:'textarea'}],
  projects:[
    {key:'title',label:'Project title',required:true},{key:'slug',label:'URL slug (lowercase words with hyphens)',required:true},{key:'summary',label:'Project summary',kind:'textarea',required:true},
    {key:'category',label:'Category',kind:'select',required:true,options:['Data Analytics','Machine Learning','Deep Learning','Business Intelligence','Generative AI','Web Development']},
    {key:'tags',label:'Technologies — one per line',kind:'list'},{key:'githubUrl',label:'GitHub repository URL',kind:'url'},{key:'liveUrl',label:'Live demo URL',kind:'url'},{key:'imageUrl',label:'Project image URL or local path'},
    {key:'featured',label:'Feature this project',kind:'checkbox'},{key:'status',label:'Project status',kind:'select',options:['In progress','Completed','Archived']},{key:'complexity',label:'Complexity',kind:'select',options:['Introductory','Intermediate','Advanced']},
    ...[['dataset','Dataset'],['cleaning','Cleaning and preparation'],['analysis','Exploratory analysis'],['features','Feature engineering'],['modeling','Modeling'],['evaluation','Evaluation'],['impact','Measured impact'],['limitations','Limitations'],['deployment','Deployment architecture']].map(([key,label])=>({key,label,kind:'textarea' as const})),
  ],
  experience:[{key:'title',label:'Role',required:true},{key:'organization',label:'Organization',required:true},{key:'dates',label:'Dates',required:true},{key:'description',label:'Responsibilities and details',kind:'textarea',required:true},{key:'tags',label:'Technologies — one per line',kind:'list'}],
  education:[{key:'title',label:'Qualification',required:true},{key:'institution',label:'Institution',required:true},{key:'dates',label:'Dates',required:true},{key:'grade',label:'Marks or grade'},{key:'status',label:'Study status',kind:'select',options:['Completed','In progress']},{key:'logoUrl',label:'Institution logo URL or local path'},{key:'logoAlt',label:'Logo description'},{key:'logoFit',label:'Logo display',kind:'select',options:['contain','cover']},{key:'description',label:'Details',kind:'textarea'},{key:'credentialUrl',label:'Verification URL',kind:'url'}],
  certifications:[{key:'title',label:'Course or credential title',required:true},{key:'organization',label:'Issuer',required:true},{key:'dates',label:'Completion date'},{key:'description',label:'Details',kind:'textarea'},{key:'credentialUrl',label:'Verification URL',kind:'url'},{key:'documentUrl',label:'Certificate PDF URL or local path'}],
  posts:[{key:'title',label:'Article title',required:true},{key:'slug',label:'URL slug',required:true},{key:'category',label:'Category',required:true},{key:'summary',label:'Summary',kind:'textarea',required:true},{key:'body',label:'Article body',kind:'textarea',required:true},{key:'tags',label:'Tags — one per line',kind:'list'},{key:'publishedAt',label:'Publication date (ISO format)'}],
  settings:[{key:'title',label:'Workspace title'},{key:'theme',label:'Default theme',kind:'select',options:['dark','light','system']},{key:'showKpis',label:'Show homepage overview tiles',kind:'checkbox'},{key:'featuredOrder',label:'Featured repository names — one per line',kind:'list'}],
};
const inputClass='min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-primary focus:outline-none focus:ring-2 focus:ring-accent/30';

export function normalizeEditorPayload(section:Section, input:unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const result={...input} as Record<string,unknown>;
  for(const key of ['skills','tags','featuredOrder']) if(Array.isArray(result[key])) result[key]=Array.from(new Set((result[key] as unknown[]).filter((item):item is string=>typeof item==='string').map(item=>item.trim()).filter(Boolean)));
  // A project and an article can validly have no technology tags.
  if((section==='projects'||section==='posts')&&!result.tags)result.tags=[];
  return result;
}

export function CmsFields({section,payload,onChange,disabled}:{section:Section;payload:string;onChange:(value:string)=>void;disabled:boolean}) {
  let data:Record<string,unknown>;
  try {const parsed=JSON.parse(payload);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();data=parsed;}catch{return <p className="text-sm text-danger">Fix the advanced content format to use the form fields.</p>;}
  function write(key:string,value:unknown,optional=false){const next={...data};if(optional&&value==='')delete next[key];else next[key]=value;onChange(JSON.stringify(next,null,2));}
  function renderField(field:Field,rowData=data,update=(value:unknown)=>write(field.key,value,!field.required),prefix:string=section) {
    const id=`cms-${prefix}-${field.key}`;
    const raw=rowData[field.key];
    const text=typeof raw==='string'||typeof raw==='number'?String(raw):'';
    const control=field.kind==='checkbox'?<label className="flex min-h-11 items-center gap-2 text-sm" htmlFor={id}><input id={id} type="checkbox" checked={field.key==='showKpis'?raw!==false:raw===true} disabled={disabled} onChange={event=>update(event.target.checked)} className="h-4 w-4 accent-accent" />{field.label}</label>:
      <><label htmlFor={id} className="mb-1 block text-xs font-medium">{field.label}{field.required&&<span className="text-accent"> *</span>}</label>{field.kind==='textarea'||field.kind==='list'?<textarea id={id} rows={field.key==='body'?10:field.kind==='list'?4:3} disabled={disabled} required={field.required} value={field.kind==='list'?(Array.isArray(raw)?raw.join('\n'):''):text} onChange={event=>update(field.kind==='list'?event.target.value.split('\n'):event.target.value)} className={inputClass} />:field.kind==='select'?<select id={id} required={field.required} disabled={disabled} value={text} onChange={event=>update(event.target.value)} className={inputClass}>{!field.required&&<option value="">Not specified</option>}{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input id={id} disabled={disabled} required={field.required} type={field.kind==='email'||field.kind==='url'?field.kind:'text'} value={text} maxLength={field.key==='cvUrl'||field.key==='photoUrl'||field.key.endsWith('Url')?2048:180} onChange={event=>update(event.target.value)} className={inputClass} />}</>;
    return <div key={id} className={field.kind==='textarea'||field.kind==='list'?'sm:col-span-2':''}>{control}</div>;
  }
  function rows(key:string,label:string,rowFields:Field[],initial:Record<string,unknown>){
    const entries=Array.isArray(data[key])?data[key] as Record<string,unknown>[]:[];
    return <section className="space-y-2 border-t border-border pt-3"><h3 className="text-sm">{label}</h3>{entries.map((row,index)=><div key={index} className="rounded-lg border border-border p-3"><div className="grid gap-3 sm:grid-cols-2">{rowFields.map(field=>renderField(field,row,value=>{const next=entries.map((entry,i)=>{if(i!==index)return entry;const changed={...entry};if(!field.required&&value==='')delete changed[field.key];else changed[field.key]=value;return changed;});write(key,next);},`${section}-${key}-${index}`))}</div>{key==='metrics'&&<div className="mt-3"><label htmlFor={`metric-value-${index}`} className="mb-1 block text-xs">Measured value *</label><input id={`metric-value-${index}`} type="number" step="any" required disabled={disabled} value={typeof row.value==='number'||typeof row.value==='string'?row.value:''} onChange={event=>write(key,entries.map((entry,i)=>i===index?{...entry,value:event.target.value===''?'':Number(event.target.value)}:entry))} className={inputClass} /></div>}<button type="button" disabled={disabled} onClick={()=>write(key,entries.filter((_,i)=>i!==index))} className="mt-2 min-h-11 rounded-lg px-2 text-xs text-danger">Remove item</button></div>)}<button type="button" disabled={disabled} className="button-secondary" onClick={()=>write(key,[...entries,{...initial}])}>Add {key==='metrics'?'metric':key==='visualizations'?'visualization':'navigation link'}</button></section>;
  }
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{fields[section].map(field=>renderField(field))}</div>
    {section==='projects'&&<>{rows('metrics','Documented evaluation metrics',[{key:'name',label:'Metric name',required:true},{key:'unit',label:'Unit'},{key:'dataset',label:'Evaluation dataset',required:true},{key:'methodology',label:'Methodology and split',kind:'textarea',required:true}],{name:'',value:'',dataset:'',methodology:''})}{rows('visualizations','Project visualizations',[{key:'title',label:'Chart title',required:true},{key:'description',label:'What the chart shows',kind:'textarea',required:true},{key:'imageUrl',label:'Image URL or local path'},{key:'sourceUrl',label:'Source URL',kind:'url'}],{title:'',description:''})}</>}
    {section==='settings'&&rows('navigation','Additional navigation links',[{key:'label',label:'Link label',required:true},{key:'href',label:'Local path or URL',required:true}],{label:'',href:''})}
  </div>;
}
