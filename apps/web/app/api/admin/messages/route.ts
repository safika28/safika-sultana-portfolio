import { z } from 'zod';
import { apiError, authorizeAdmin, checkSameOrigin, CmsError, readJsonBody } from '@/lib/cms';

export const runtime = 'nodejs';
export async function PATCH(request: Request) {
  try {
    checkSameOrigin(request);
    const { db } = await authorizeAdmin(request);
    const input = z.object({ id: z.string().uuid(), status: z.enum(['new', 'reviewing', 'closed']) }).strict().safeParse(await readJsonBody(request, 2000));
    if (!input.success) throw new CmsError(400, 'Choose a valid message status.');
    const { data, error } = await db.from('portfolio_inquiries').update({ status: input.data.status }).eq('id', input.data.id).select('id').single();
    if (error || !data) throw new CmsError(503, 'Message status could not be updated.');
    return Response.json({ message: 'Message status updated.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
