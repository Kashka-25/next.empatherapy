import { currentAdmin } from '@/lib/admin-auth.mjs';
import { can } from '@/lib/accounts.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { photosOf } from '@/lib/photos.mjs';
import { serveImage } from '@/lib/images/serve.mjs';

export const dynamic = 'force-dynamic';

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * Previews of photos that are not public yet (drafts, unverified profiles, photos waiting for review).
 * Signed-in editors and owners see any; an Alchemist sees only their own profile's.
 */
export async function GET(_request, { params }) {
  const me = await currentAdmin();
  if (!me) return notFound();
  if (!can(me.role, 'content')) {
    if (me.role !== 'alchemist' || !me.profile_id) return notFound();
    const mine = (await loadContent()).alchemists.find((a) => a.id === me.profile_id);
    if (!mine || !photosOf(mine).some((p) => p.id === params.id)) return notFound();
  }
  return serveImage(params.id, { isPublic: false });
}
