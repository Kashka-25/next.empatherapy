/** Loading posts from storage for pages. Kept apart from lib/posts.mjs so the pure logic stays testable without a store. */
import { getStore } from './store/index.mjs';
import { publicContent } from './content-store.mjs';
import { publicPosts } from './posts.mjs';

export async function loadPosts(store = getStore()) {
  return store ? store.list('posts') : [];
}

/** Published posts whose author is public, newest first, each with the author attached. */
export async function loadPublicPosts(store = getStore()) {
  const [posts, { alchemists }] = await Promise.all([loadPosts(store), publicContent(store)]);
  return publicPosts(posts, alchemists);
}
