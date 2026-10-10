import { apiError } from '@/lib/cms';
import { getAccountProfile } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try { return Response.json(await getAccountProfile(request), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
