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
import { loadContent } from '@/lib/content-store.mjs';
import { validateAlchemist, validateModality, modalityDeleteBlocker } from '@/lib/admin-content.mjs';

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
  const v = validateFeature(raw, await loadFeatures(store), (await loadContent(store)).modalities);
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
    const v = validateFeature({ ...rec, publication_status: status }, await loadFeatures(store), (await loadContent(store)).modalities);
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

/* ---------- Alchemist profiles and modality pages ---------- */
const refreshAll = () => revalidatePath('/', 'layout');
const formValues = (fd) => {
  const raw = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith('$')));
  for (const k of ['delivery_formats', 'themes', 'styles', 'related_modalities']) raw[k] = fd.getAll(k);
  return raw;
};

/** Used with useFormState: returns errors and the typed values when something needs fixing, redirects when saved. */
export async function saveAlchemistAction(_prev, formData) {
  await requireAdmin();
  const store = needStore();
  const id = text(formData, 'id');
  const content = await loadContent(store);
  const existing = id ? content.alchemists.find((a) => a.id === id) : null;
  if (id && !existing) redirect('/admin/alchemists?e=missing');
  const raw = formValues(formData);
  const v = validateAlchemist(raw, existing, { alchemists: content.alchemists, modalities: content.modalities });
  if (!v.valid) return { errors: v.errors, values: raw, attempt: Date.now() };
  await store.put('alchemists', v.record);
  refreshAll();
  redirect(`/admin/alchemists/${encodeURIComponent(v.record.id)}?saved=1`);
}

export async function resetAlchemistAction(formData) {
  await requireAdmin();
  await needStore().remove('alchemists', text(formData, 'id'));
  refreshAll();
  redirect('/admin/alchemists?reset=1');
}

export async function saveModalityAction(_prev, formData) {
  await requireAdmin();
  const store = needStore();
  const id = text(formData, 'id');
  const content = await loadContent(store);
  const existing = id ? content.modalities.find((m) => m.id === id) : null;
  if (id && !existing) redirect('/admin/modalities?e=missing');
  const raw = formValues(formData);
  const v = validateModality(raw, existing, { modalities: content.modalities });
  if (!v.valid) return { errors: v.errors, values: raw, attempt: Date.now() };
  await store.put('modalities', v.record);
  refreshAll();
  redirect(`/admin/modalities/${encodeURIComponent(v.record.id)}?saved=1`);
}

export async function resetModalityAction(formData) {
  await requireAdmin();
  const store = needStore();
  const id = text(formData, 'id');
  const content = await loadContent(store);
  const m = content.modalities.find((x) => x.id === id);
  if (m) {
    const blocker = modalityDeleteBlocker(m, content.alchemists, content.seedIds.modalities);
    // A built-in modality can always be reset to its original; a new one only when nobody lists it.
    if (blocker && !content.seedIds.modalities.has(id)) redirect(`/admin/modalities/${encodeURIComponent(id)}?error=${encodeURIComponent(blocker)}`);
  }
  await store.remove('modalities', id);
  refreshAll();
  redirect('/admin/modalities?reset=1');
}
