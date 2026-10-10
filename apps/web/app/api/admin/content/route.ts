import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { apiError, authorizeAdmin, checkSameOrigin, CmsError, readJsonBody, validateContent } from '@/lib/cms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { db, role } = await authorizeAdmin(request);
    const [records, messages] = await Promise.all([
      db.from('portfolio_content_records').select('id,section,payload,published,position,updated_at').order('position').limit(500),
      db.from('portfolio_inquiries').select('id,name,email,subject,message,status,created_at').order('created_at', { ascending: false }).limit(100)
    ]);
    if (records.error || messages.error) throw new CmsError(503, 'Content could not be loaded.');
    return Response.json({ records: records.data, messages: messages.data, role }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

async function save(request: Request, update: boolean) {
  try {
    checkSameOrigin(request);
    const { db, userId, role } = await authorizeAdmin(request);
    const record = validateContent(await readJsonBody(request));
    if (record.section === 'settings' && role !== 'super_admin') throw new CmsError(403, 'Only a site administrator can change site settings.');
    const { id, ...values } = record;
    if (update && !id) throw new CmsError(400, 'Select a record to update.');
    if (update && role !== 'super_admin') {
      const existing = await db.from('portfolio_content_records').select('section').eq('id', id!).maybeSingle();
      if (existing.error) throw new CmsError(503, 'The record could not be loaded.');
      if (!existing.data) throw new CmsError(404, 'The record does not exist.');
      if (existing.data.section === 'settings') throw new CmsError(403, 'Only a site administrator can change site settings.');
    }
    const updateQuery = db.from('portfolio_content_records').update({ ...values, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', id || '00000000-0000-0000-0000-000000000000');
    const query = update ? (role === 'super_admin' ? updateQuery : updateQuery.neq('section', 'settings')) : db.from('portfolio_content_records').insert({ ...values, updated_by: userId });
    const { data, error } = await query.select('id').single();
    if (error || !data) throw new CmsError(503, 'The record could not be saved.');
    revalidatePath('/', 'layout');
    return Response.json({ id: data.id, message: 'Record saved.' }, { status: update ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }
export async function DELETE(request: Request) {
  try {
    checkSameOrigin(request);
    const { db, role } = await authorizeAdmin(request);
    const input = z.object({ id: z.string().uuid() }).strict().safeParse(await readJsonBody(request, 2000));
    if (!input.success) throw new CmsError(400, 'Select a valid record.');
    if (role !== 'super_admin') throw new CmsError(403, 'Only a site administrator can delete records.');
    const { data, error } = await db.from('portfolio_content_records').delete().eq('id', input.data.id).select('id').single();
    if (error || !data) throw new CmsError(503, 'The record could not be deleted.');
    revalidatePath('/', 'layout');
    return Response.json({ message: 'Record deleted.' });
  } catch (error) { return apiError(error); }
}
