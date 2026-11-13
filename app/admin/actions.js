'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, adminConfigured } from '@/lib/admin-auth.mjs';
import { createAccount, authenticate, updateAccount, activeOwnerCount, normaliseEmail } from '@/lib/accounts.mjs';
import { purgeExpired } from '@/lib/retention.mjs';
import { getBlobStore, newImageId } from '@/lib/images/blobs.mjs';
import { inspectImage, IMAGE_MESSAGES, MAX_BYTES } from '@/lib/images/inspect.mjs';
import { MAX_PHOTOS, addPhoto, updatePhoto, makePrimary, movePhoto, removePhoto, canHavePhotos, photosOf, cleanAlt, cleanCaption, altError } from '@/lib/photos.mjs';
import { SESSION_COOKIE, createSession } from '@/lib/session.mjs';
import { verifyPassword } from '@/lib/password.mjs';
import { createSharedLimiter, clientKey } from '@/lib/ratelimit.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { reviewApplication, removeApplication } from '@/lib/applications.mjs';
import { validateFeature, loadFeatures, seedFeatures } from '@/lib/features.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { validateAlchemist, validateModality, modalityDeleteBlocker } from '@/lib/admin-content.mjs';

const WINDOW = 15 * 60 * 1000;
const loginByAddress = createSharedLimiter({ name: 'login-address', max: 5, windowMs: WINDOW, getStore });
const loginByEmail = createSharedLimiter({ name: 'login-email', max: 5, windowMs: WINDOW, getStore });
const passwordChange = createSharedLimiter({ name: 'password-change', max: 5, windowMs: WINDOW, getStore });
const text = (fd, k) => String(fd.get(k) ?? '');

function needStore() {
  const store = getStore();
  if (!store) redirect('/admin?e=store');
  return store;
}

/* ---------- sign in and out ---------- */
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/admin' };

export async function login(formData) {
  if (!adminConfigured()) redirect('/admin/login?e=config');
  const address = clientKey(headers());
  const email = normaliseEmail(text(formData, 'email'));
  if (!(await loginByAddress.check(address)).ok) redirect('/admin/login?e=wait');
  if (email && !(await loginByEmail.check(email)).ok) redirect('/admin/login?e=wait'); // slows guessing spread across many addresses
  const password = text(formData, 'password');
  const store = getStore();
  let who = null; // null means the setup owner
  if (email) {
    const acct = store ? await authenticate(store, email, password) : null;
    if (!acct) redirect('/admin/login?e=bad');
    who = { sub: acct.id, role: acct.role };
  } else {
    // The setup password works only until the first owner account exists.
    const closed = store ? (await activeOwnerCount(store)) > 0 : false;
    if (closed || !process.env.ADMIN_PASSWORD_HASH || !(await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH))) redirect('/admin/login?e=bad');
  }
  await loginByAddress.reset(address);
  if (email) await loginByEmail.reset(email);
  cookies().set(SESSION_COOKIE, await createSession(process.env.ADMIN_SESSION_SECRET, 8 * 3600, Date.now(), who), { ...cookieOptions, maxAge: 8 * 3600 });
  redirect('/admin');
}

export async function logout() {
  cookies().set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  redirect('/admin/login');
}

/* ---------- accounts (owners) ---------- */
const accountsError = (msg) => redirect(`/admin/accounts?error=${encodeURIComponent(msg)}`);
const REASON = {
  last_owner: 'There must always be at least one active owner.',
  bad_role: 'Choose a valid role.',
  bad_password: 'Use a password of at least 12 characters.',
  not_found: 'That account no longer exists.',
};

export async function createAccountAction(formData) {
  const me = await requireAdmin('accounts');
  const store = needStore();
  const r = await createAccount(store, { email: text(formData, 'email'), name: text(formData, 'name'), role: text(formData, 'role'), password: text(formData, 'password') });
  if (!r.ok) accountsError(Object.values(r.errors)[0]);
  if (me.id === 'bootstrap') { // the setup password has done its job: sign in with the new account
    cookies().set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    redirect('/admin/login?e=created');
  }
  revalidatePath('/admin/accounts');
  redirect('/admin/accounts?saved=1');
}

export async function updateAccountAction(formData) {
  const me = await requireAdmin('accounts');
  const store = needStore();
  const id = text(formData, 'id');
  const change = {};
  if (formData.has('role')) change.role = text(formData, 'role');
  if (formData.has('active')) change.active = text(formData, 'active') === 'yes';
  if (formData.has('password')) change.password = text(formData, 'password');
  if (id === me.id && (change.active === false || (change.role && change.role !== 'owner'))) accountsError('You cannot lock yourself out. Ask another owner to do it.');
  const r = await updateAccount(store, id, change);
  if (!r.ok) accountsError(REASON[r.reason] ?? 'That did not work.');
  revalidatePath('/admin/accounts');
  redirect('/admin/accounts?saved=1');
}

/** Anyone signed in with an account can change their own password. The current one is required. */
export async function changeOwnPasswordAction(formData) {
  const me = await requireAdmin();
  const store = needStore();
  const back = (q) => redirect(`/admin/account?${q}`);
  const fail = (msg) => back('error=' + encodeURIComponent(msg));
  if (me.id === 'bootstrap') fail('The setup login has no password to change here.');
  if (!(await passwordChange.check(me.id)).ok) fail('Too many attempts. Please wait a few minutes.');
  const next = text(formData, 'new_password');
  if (next !== text(formData, 'confirm_password')) fail('The new passwords do not match.');
  if (!(await authenticate(store, me.email, text(formData, 'current_password')))) fail('The current password is not right.');
  const r = await updateAccount(store, me.id, { password: next });
  if (!r.ok) fail(REASON[r.reason] ?? 'That did not work.');
  back('saved=1');
}

/* ---------- retention (owners) ---------- */
export async function purgeExpiredAction() {
  await requireAdmin('retention');
  const r = await purgeExpired(needStore());
  revalidatePath('/admin/retention');
  redirect(`/admin/retention?done=${r.applications}`);
}

/* ---------- applications ---------- */
export async function reviewApplicationAction(formData) {
  await requireAdmin('applications');
  const store = needStore();
  const id = text(formData, 'id');
  const r = await reviewApplication(store, id, { status: formData.get('status') ?? undefined, notes: formData.has('notes') ? text(formData, 'notes') : undefined });
  revalidatePath('/admin/applications');
  redirect(r.ok ? `/admin/applications/${encodeURIComponent(id)}?saved=1` : '/admin/applications?e=missing');
}

export async function deleteApplicationAction(formData) {
  await requireAdmin('applications');
  await removeApplication(needStore(), text(formData, 'id'));
  revalidatePath('/admin/applications');
  redirect('/admin/applications?deleted=1');
}

/* ---------- weekly features ---------- */
const refreshPublic = () => { revalidatePath('/'); revalidatePath('/modalities'); revalidatePath('/admin/features'); };

export async function seedFeaturesAction() {
  await requireAdmin('content');
  await seedFeatures(needStore());
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function addFeatureAction(formData) {
  await requireAdmin('content');
  const store = needStore();
  const raw = Object.fromEntries(['modality_id', 'feature_start', 'feature_end', 'featured_position', 'editorial_introduction', 'publication_status'].map((k) => [k, text(formData, k)]));
  const v = validateFeature(raw, await loadFeatures(store), (await loadContent(store)).modalities);
  if (!v.valid) redirect(`/admin/features?error=${encodeURIComponent(Object.values(v.errors)[0])}`);
  await store.put('features', v.data);
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function setFeatureStatusAction(formData) {
  await requireAdmin('content');
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
  await requireAdmin('content');
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
  await requireAdmin('content');
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
  await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const stored = await store.get('alchemists', id);
  await store.remove('alchemists', id);
  const blobs = getBlobStore();
  if (blobs) for (const p of photosOf(stored)) await blobs.remove(p.id).catch(() => {}); // photo files go with the profile
  refreshAll();
  redirect('/admin/alchemists?reset=1');
}

export async function saveModalityAction(_prev, formData) {
  await requireAdmin('content');
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
  await requireAdmin('content');
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

/* ---------- Alchemist photos ---------- */
const photoBack = (id, query) => redirect(`/admin/alchemists/${encodeURIComponent(id)}?${query}#photos`);
const photoFail = (id, msg) => photoBack(id, `photo_error=${encodeURIComponent(msg)}`);

async function editableAlchemist(store, id) {
  const a = (await loadContent(store)).alchemists.find((x) => x.id === id);
  if (!a) redirect('/admin/alchemists?e=missing');
  return a;
}

export async function uploadPhotoAction(formData) {
  await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const a = await editableAlchemist(store, id);
  const blobs = getBlobStore();
  if (!blobs) photoFail(id, 'Photo storage is not switched on.');
  if (!canHavePhotos(a)) photoFail(id, 'Example profiles are fictional, so they cannot have photos.');
  if (photosOf(a).length >= MAX_PHOTOS) photoFail(id, `A profile can have up to ${MAX_PHOTOS} photos. Remove one first.`);
  if (!formData.get('permission')) photoFail(id, 'Please confirm the person has agreed to the photo being published.');
  const alt = cleanAlt(text(formData, 'alt'));
  const altProblem = altError(alt);
  if (altProblem) photoFail(id, altProblem);
  const file = formData.get('photo');
  if (!file || typeof file === 'string' || !file.size) photoFail(id, 'Choose a photo to upload.');
  if (file.size > MAX_BYTES) photoFail(id, IMAGE_MESSAGES.too_large);
  const checked = inspectImage(new Uint8Array(await file.arrayBuffer()));
  if (!checked.ok) photoFail(id, IMAGE_MESSAGES[checked.reason] ?? IMAGE_MESSAGES.corrupt);

  const imageId = newImageId(checked.ext);
  await blobs.put(imageId, checked.bytes, checked.contentType);
  const added = addPhoto(photosOf(a), { id: imageId, alt, caption: cleanCaption(text(formData, 'caption')), w: checked.width, h: checked.height, added_at: new Date().toISOString() });
  try {
    await store.put('alchemists', { ...a, photos: added.photos });
  } catch (e) {
    await blobs.remove(imageId).catch(() => {}); // do not leave a file nobody points to
    throw e;
  }
  refreshAll();
  photoBack(id, 'photo_saved=1');
}

export async function photoAction(formData) {
  await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const photoId = text(formData, 'photo_id');
  const intent = text(formData, 'intent');
  const a = await editableAlchemist(store, id);
  const list = photosOf(a);
  let r;
  if (intent === 'save') {
    const alt = cleanAlt(text(formData, 'alt'));
    const problem = altError(alt);
    if (problem) photoFail(id, problem);
    r = updatePhoto(list, photoId, { alt, caption: cleanCaption(text(formData, 'caption')) });
  } else if (intent === 'primary') r = makePrimary(list, photoId);
  else if (intent === 'left' || intent === 'right') r = movePhoto(list, photoId, intent);
  else if (intent === 'remove') r = removePhoto(list, photoId);
  else photoFail(id, 'That did not work.');
  if (!r.ok) photoFail(id, 'That photo no longer exists.');
  await store.put('alchemists', { ...a, photos: r.photos });
  if (intent === 'remove') { const blobs = getBlobStore(); if (blobs) await blobs.remove(photoId).catch(() => {}); }
  refreshAll();
  photoBack(id, 'photo_saved=1');
}
