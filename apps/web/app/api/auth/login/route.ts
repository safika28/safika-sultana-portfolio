import { apiError, checkSameOrigin, CmsError, readJsonBody } from '@/lib/cms';
import { enforceLoginProcessLimit, loginSchema, signIn } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const input = loginSchema.safeParse(await readJsonBody(request, 4096));
    if (!input.success) throw new CmsError(400, 'Enter your username or email and password.');
    enforceLoginProcessLimit(request, input.data.identifier);
    const session = await signIn(input.data.identifier, input.data.password);
    return Response.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
