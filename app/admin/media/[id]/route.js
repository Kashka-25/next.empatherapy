import { currentAdmin } from '@/lib/admin-auth.mjs';
import { can } from '@/lib/accounts.mjs';
import { serveImage } from '@/lib/images/serve.mjs';

export const dynamic = 'force-dynamic';

/** Previews of photos that are not public yet (drafts, unverified profiles). Signed-in editors and owners only. */
export async function GET(_request, { params }) {
  const me = await currentAdmin();
  if (!me || !can(me.role, 'content')) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return serveImage(params.id, { isPublic: false });
}
