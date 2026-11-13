import { loadPublicPosts } from '@/lib/posts-store.mjs';
import { atomFeed } from '@/lib/posts.mjs';
import { siteUrl } from '@/lib/site.mjs';

export const revalidate = 300;

/** The open feed: anyone can follow or republish these posts, with credit (Creative Commons Attribution 4.0). */
export async function GET() {
  const xml = atomFeed(await loadPublicPosts(), siteUrl());
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
