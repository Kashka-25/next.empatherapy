import { publicContent } from '@/lib/content-store.mjs';
import { isPublicPhoto } from '@/lib/photos.mjs';
import { serveImage } from '@/lib/images/serve.mjs';

export const dynamic = 'force-dynamic';

/** Public photos: only images that belong to a profile visitors can see. Anything else is a plain 404. */
export async function GET(_request, { params }) {
  const { alchemists } = await publicContent();
  if (!isPublicPhoto(alchemists, params.id)) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return serveImage(params.id, { isPublic: true });
}
