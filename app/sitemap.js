import { publicContent } from '@/lib/content-store.mjs';
import { sitemapEntries, indexingOn } from '@/lib/site.mjs';
import { loadPublicPosts } from '@/lib/posts-store.mjs';

export const revalidate = 3600;

export default async function sitemap() {
  if (!indexingOn()) return [];
  return sitemapEntries({ ...(await publicContent()), posts: await loadPublicPosts() });
}
