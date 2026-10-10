import { contactSchema } from '@/lib/contact-validation';
import { apiError, checkSameOrigin, CmsError, enforceContactLimit, getServerDatabase, readJsonBody } from '@/lib/cms';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const input = contactSchema.safeParse(await readJsonBody(request, 24_000));
    if (!input.success) return Response.json({ error: 'Check your details and try again.', fields: input.error.flatten().fieldErrors }, { status: 400 });
    const db = getServerDatabase();
    if (!db) throw new CmsError(503, 'Messaging is not connected yet. Please email safikasultana90@gmail.com.');
    await enforceContactLimit(request, db);
    const { website: _website, ...message } = input.data;
    const { error } = await db.from('portfolio_inquiries').insert(message);
    if (error) throw new CmsError(503, 'Your message could not be saved. Please try email instead.');
    return Response.json({ message: 'Your message has been saved. Thank you for reaching out.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
