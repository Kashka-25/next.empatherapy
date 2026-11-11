import { getBlobStore, IMAGE_ID } from './blobs.mjs';

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * Sends a stored photo. `isPublic` photos are cacheable for a year (their address is random and never reused);
 * previews for the admin are never cached. Headers stop the browser guessing a different type or running anything.
 */
export async function serveImage(id, { isPublic }) {
  if (!IMAGE_ID.test(String(id))) return notFound();
  const blobs = getBlobStore();
  if (!blobs) return notFound();
  const img = await blobs.get(id);
  if (!img?.contentType) return notFound();
  return new Response(img.bytes, {
    status: 200,
    headers: {
      'Content-Type': img.contentType,
      'Content-Length': String(img.bytes.length),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
    },
  });
}
