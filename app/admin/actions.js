'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, adminConfigured } from '@/lib/admin-auth.mjs';
import { SESSION_COOKIE, createSession } from '@/lib/session.mjs';
import { verifyPassword } from '@/lib/password.mjs';
import { createLimiter, clientKey } from '@/lib/ratelimit.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { reviewApplication, removeApplication } from '@/lib/applications.mjs';
import { validateFeature, loadFeatures, seedFeatures } from '@/lib/features.mjs';

const loginLimiter = createLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const text = (fd, k) => String(fd.get(k) ?? '');

function needStore() {
  const store = getStore();
  if (!store) redirect('/admin?e=store');
  return store;
}

/* ---------- sign in and out ---------- */
export async function login(formData) {
  if (!adminConfigured()) redirect('/admin/login?e=config');
  const key = clientKey(headers());
  if (!loginLimiter.check(key).ok) redirect('/admin/login?e=wait');
  const ok = await verifyPassword(text(formData, 'password'), process.env.ADMIN_PASSWORD_HASH);
  if (!ok) redirect('/admin/login?e=bad');
  loginLimiter.reset(key);
  cookies().set(SESSION_COOKIE, await createSession(process.env.ADMIN_SESSION_SECRET), {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/admin', maxAge: 8 * 3600,
  });
  redirect('/admin');
}

export async function logout() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'strict', path: '/admin', maxAge: 0 });
  redirect('/admin/login');
}

/* ---------- applications ---------- */
export async function reviewApplicationAction(formData) {
  await requireAdmin();
  const store = needStore();
  const id = text(formData, 'id');
  const r = await reviewApplication(store, id, { status: formData.get('status') ?? undefined, notes: formData.has('notes') ? text(formData, 'notes') : undefined });
  revalidatePath('/admin/applications');
  redirect(r.ok ? `/admin/applications/${encodeURIComponent(id)}?saved=1` : '/admin/applications?e=missing');
}

export async function deleteApplicationAction(formData) {
  await requireAdmin();
  await removeApplication(needStore(), text(formData, 'id'));
  revalidatePath('/admin/applications');
  redirect('/admin/applications?deleted=1');
}

/* ---------- weekly features ---------- */
const refreshPublic = () => { revalidatePath('/'); revalidatePath('/modalities'); revalidatePath('/admin/features'); };

export async function seedFeaturesAction() {
  await requireAdmin();
  await seedFeatures(needStore());
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function addFeatureAction(formData) {
  await requireAdmin();
  const store = needStore();
  const raw = Object.fromEntries(['modality_id', 'feature_start', 'feature_end', 'featured_position', 'editorial_introduction', 'publication_status'].map((k) => [k, text(formData, k)]));
  const v = validateFeature(raw, await loadFeatures(store));
  if (!v.valid) redirect(`/admin/features?error=${encodeURIComponent(Object.values(v.errors)[0])}`);
  await store.put('features', v.data);
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function setFeatureStatusAction(formData) {
  await requireAdmin();
  const store = needStore();
  const rec = await store.get('features', text(formData, 'id'));
  const status = text(formData, 'status');
  if (rec && ['published', 'draft', 'archived'].includes(status)) {
    const v = validateFeature({ ...rec, publication_status: status }, await loadFeatures(store));
    if (!v.valid) redirect(`/admin/features?error=${encodeURIComponent(Object.values(v.errors)[0])}`);
    await store.put('features', { ...rec, publication_status: status });
  }
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function deleteFeatureAction(formData) {
  await requireAdmin();
  await needStore().remove('features', text(formData, 'id'));
  refreshPublic();
  redirect('/admin/features?saved=1');
}
