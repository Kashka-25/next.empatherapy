'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, adminConfigured } from '@/lib/admin-auth.mjs';
import { createAccount, authenticate, updateAccount, activeOwnerCount, normaliseEmail, touchLogin, activeAccount, beginTotp, cancelTotp, confirmTotp, disableTotp, checkSecondFactor } from '@/lib/accounts.mjs';
import { purgeExpired } from '@/lib/retention.mjs';
import { draftFromApplication } from '@/lib/application-to-profile.mjs';
import { can } from '@/lib/accounts.mjs';
import { recordAudit, describeSave, PHOTO_INTENT } from '@/lib/audit.mjs';
import { updateEnquiry, setRatePercent, ENQUIRY_LABEL } from '@/lib/enquiries.mjs';
import { getBlobStore, newImageId } from '@/lib/images/blobs.mjs';
import { inspectImage, IMAGE_MESSAGES, MAX_BYTES } from '@/lib/images/inspect.mjs';
import { MAX_PHOTOS, addPhoto, updatePhoto, makePrimary, movePhoto, removePhoto, canHavePhotos, photosOf, cleanAlt, cleanCaption, altError } from '@/lib/photos.mjs';
import { SESSION_COOKIE, PENDING_COOKIE, pendingSecret, createSession, readSession } from '@/lib/session.mjs';
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
const secondStepByAccount = createSharedLimiter({ name: 'second-step-account', max: 5, windowMs: WINDOW, getStore });
const secondStepByAddress = createSharedLimiter({ name: 'second-step-address', max: 10, windowMs: WINDOW, getStore });
const passwordChange = createSharedLimiter({ name: 'password-change', max: 5, windowMs: WINDOW, getStore });
const text = (fd, k) => String(fd.get(k) ?? '');

/** Notes who did what in the activity log. Never blocks the action it describes. */
async function audit(me, action, target, summary) {
  try { await recordAudit(getStore(), me, action, target, summary); }
  catch (e) { console.error('Activity log could not be written:', e.message); }
}

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
  let actor = { id: 'bootstrap', name: 'Setup owner', role: 'owner' };
  if (email) {
    const acct = store ? await authenticate(store, email, password, { touch: false }) : null;
    if (!acct) redirect('/admin/login?e=bad');
    if (acct.two_step) { // right password, but a code is still needed: half signed in, in a separate short-lived cookie
      cookies().set(PENDING_COOKIE, await createSession(pendingSecret(process.env.ADMIN_SESSION_SECRET), 300, Date.now(), { sub: acct.id, role: 'pending' }), { ...cookieOptions, maxAge: 300 });
      redirect('/admin/login/code');
    }
    await touchLogin(store, acct.id);
    who = { sub: acct.id, role: acct.role };
    actor = { id: acct.id, name: acct.name, role: acct.role };
  } else {
    // The setup password works only until the first owner account exists.
    const closed = store ? (await activeOwnerCount(store)) > 0 : false;
    if (closed || !process.env.ADMIN_PASSWORD_HASH || !(await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH))) redirect('/admin/login?e=bad');
  }
  await loginByAddress.reset(address);
  if (email) await loginByEmail.reset(email);
  await audit(actor, 'sign_in', actor.id, 'Signed in');
  cookies().set(SESSION_COOKIE, await createSession(process.env.ADMIN_SESSION_SECRET, 8 * 3600, Date.now(), who), { ...cookieOptions, maxAge: 8 * 3600 });
  redirect('/admin');
}

export async function logout() {
  cookies().set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  cookies().set(PENDING_COOKIE, '', { ...cookieOptions, maxAge: 0 });
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
  await audit(me, 'account_created', r.account.id, `Created ${r.account.role} account for ${r.account.name}`);
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
  if (formData.has('reset_two_step')) change.resetTwoStep = true;
  if (id === me.id && (change.active === false || (change.role && change.role !== 'owner'))) accountsError('You cannot lock yourself out. Ask another owner to do it.');
  const r = await updateAccount(store, id, change);
  if (!r.ok) accountsError(REASON[r.reason] ?? 'That did not work.');
  await audit(me, 'account_changed', id, `${[change.role !== undefined && `Changed role to ${change.role}`, change.active !== undefined && (change.active ? 'Reactivated' : 'Deactivated'), change.password !== undefined && 'Reset the password', change.resetTwoStep && 'Reset two-step sign-in'].filter(Boolean).join(', ')} for ${r.account.name}`);
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
  await audit(me, 'password_changed', me.id, 'Changed their own password');
  back('saved=1');
}

/* ---------- retention (owners) ---------- */
export async function purgeExpiredAction() {
  const me = await requireAdmin('retention');
  const r = await purgeExpired(needStore());
  await audit(me, 'retention_purge', 'retention', `Deleted ${r.applications} expired application(s), ${r.enquiries} old enquir${r.enquiries === 1 ? 'y' : 'ies'}, ${r.counters} old spam-protection counter(s) and ${r.audit} old log entr${r.audit === 1 ? 'y' : 'ies'}`);
  revalidatePath('/admin/retention');
  redirect(`/admin/retention?done=${r.applications}`);
}

/* ---------- applications ---------- */
export async function reviewApplicationAction(formData) {
  const me = await requireAdmin('applications');
  const store = needStore();
  const id = text(formData, 'id');
  const r = await reviewApplication(store, id, { status: formData.get('status') ?? undefined, notes: formData.has('notes') ? text(formData, 'notes') : undefined });
  if (r.ok) await audit(me, 'application_updated', id, formData.get('status') ? `Status set to ${text(formData, 'status')}` : 'Review notes updated');
  revalidatePath('/admin/applications');
  redirect(r.ok ? `/admin/applications/${encodeURIComponent(id)}?saved=1` : '/admin/applications?e=missing');
}

export async function deleteApplicationAction(formData) {
  const me = await requireAdmin('applications');
  const store = needStore();
  const id = text(formData, 'id');
  // A deletion request covers a draft profile made from the application too. A published profile is kept (remove it separately).
  const app = await store.get('applications', id);
  if (app?.profile_id) {
    const draft = await store.get('alchemists', app.profile_id);
    if (draft && draft.publication_status !== 'published' && draft.source) {
      await store.remove('alchemists', draft.id);
      const blobs = getBlobStore();
      if (blobs) for (const p of photosOf(draft)) await blobs.remove(p.id).catch(() => {});
    }
  }
  await removeApplication(store, id);
  await audit(me, 'application_deleted', id, 'Deleted an application and any unpublished draft made from it');
  revalidatePath('/admin/applications');
  redirect('/admin/applications?deleted=1');
}

/* ---------- weekly features ---------- */
const refreshPublic = () => { revalidatePath('/'); revalidatePath('/modalities'); revalidatePath('/admin/features'); };

export async function seedFeaturesAction() {
  const me = await requireAdmin('content');
  await seedFeatures(needStore());
  await audit(me, 'feature_changed', 'features', 'Loaded the sample weekly schedule');
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function addFeatureAction(formData) {
  const me = await requireAdmin('content');
  const store = needStore();
  const raw = Object.fromEntries(['modality_id', 'feature_start', 'feature_end', 'featured_position', 'editorial_introduction', 'publication_status'].map((k) => [k, text(formData, k)]));
  const v = validateFeature(raw, await loadFeatures(store), (await loadContent(store)).modalities);
  if (!v.valid) redirect(`/admin/features?error=${encodeURIComponent(Object.values(v.errors)[0])}`);
  await store.put('features', v.data);
  await audit(me, 'feature_changed', v.data.modality_id, `Scheduled ${v.data.modality_id} from ${v.data.feature_start} to ${v.data.feature_end}`);
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function setFeatureStatusAction(formData) {
  const me = await requireAdmin('content');
  const store = needStore();
  const rec = await store.get('features', text(formData, 'id'));
  const status = text(formData, 'status');
  if (rec && ['published', 'draft', 'archived'].includes(status)) {
    const v = validateFeature({ ...rec, publication_status: status }, await loadFeatures(store), (await loadContent(store)).modalities);
    if (!v.valid) redirect(`/admin/features?error=${encodeURIComponent(Object.values(v.errors)[0])}`);
    await store.put('features', { ...rec, publication_status: status });
  }
  if (rec) await audit(me, 'feature_changed', rec.id, `Set a weekly feature to ${status}`);
  refreshPublic();
  redirect('/admin/features?saved=1');
}

export async function deleteFeatureAction(formData) {
  const me = await requireAdmin('content');
  await needStore().remove('features', text(formData, 'id'));
  await audit(me, 'feature_changed', text(formData, 'id'), 'Removed a scheduled feature');
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
  const me = await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const content = await loadContent(store);
  const existing = id ? content.alchemists.find((a) => a.id === id) : null;
  if (id && !existing) redirect('/admin/alchemists?e=missing');
  const raw = formValues(formData);
  const v = validateAlchemist(raw, existing, { alchemists: content.alchemists, modalities: content.modalities });
  if (!v.valid) return { errors: v.errors, values: raw, attempt: Date.now() };
  await store.put('alchemists', v.record);
  await audit(me, 'alchemist_saved', v.record.id, describeSave(existing, v.record));
  refreshAll();
  redirect(`/admin/alchemists/${encodeURIComponent(v.record.id)}?saved=1`);
}

export async function resetAlchemistAction(formData) {
  const me = await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const stored = await store.get('alchemists', id);
  await store.remove('alchemists', id);
  const blobs = getBlobStore();
  if (blobs) for (const p of photosOf(stored)) await blobs.remove(p.id).catch(() => {}); // photo files go with the profile
  await audit(me, 'alchemist_removed', id, `Reset or deleted profile ${stored?.name ?? id}`);
  refreshAll();
  redirect('/admin/alchemists?reset=1');
}

export async function saveModalityAction(_prev, formData) {
  const me = await requireAdmin('content');
  const store = needStore();
  const id = text(formData, 'id');
  const content = await loadContent(store);
  const existing = id ? content.modalities.find((m) => m.id === id) : null;
  if (id && !existing) redirect('/admin/modalities?e=missing');
  const raw = formValues(formData);
  const v = validateModality(raw, existing, { modalities: content.modalities });
  if (!v.valid) return { errors: v.errors, values: raw, attempt: Date.now() };
  await store.put('modalities', v.record);
  await audit(me, 'modality_saved', v.record.id, describeSave(existing, v.record, 'modality'));
  refreshAll();
  redirect(`/admin/modalities/${encodeURIComponent(v.record.id)}?saved=1`);
}

export async function resetModalityAction(formData) {
  const me = await requireAdmin('content');
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
  await audit(me, 'modality_removed', id, `Reset or deleted modality ${m?.name ?? id}`);
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
  const me = await requireAdmin('content');
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
  await audit(me, 'photo_changed', id, `Added a photo to ${a.name}`);
  refreshAll();
  photoBack(id, 'photo_saved=1');
}

export async function photoAction(formData) {
  const me = await requireAdmin('content');
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
  await audit(me, 'photo_changed', id, `${PHOTO_INTENT[intent] ?? 'Changed a photo'} for ${a.name}`);
  refreshAll();
  photoBack(id, 'photo_saved=1');
}

/* ---------- application to draft profile ---------- */
/**
 * Creates a hidden, unverified DRAFT profile from an approved application, for a person to finish and check.
 * It never publishes anything. Needs access to both applications and profiles, so in practice owners.
 */
export async function createDraftProfileAction(formData) {
  const me = await requireAdmin('applications');
  if (!can(me.role, 'content')) redirect('/admin?e=forbidden');
  const store = needStore();
  const id = text(formData, 'id');
  const app = await store.get('applications', id);
  const back = (q) => redirect(`/admin/applications/${encodeURIComponent(id)}?${q}`);
  if (!app) redirect('/admin/applications?e=missing');
  if (app.status !== 'approved') back('draft_error=' + encodeURIComponent('Approve the application first.'));

  const content = await loadContent(store);
  if (app.profile_id && content.alchemists.some((a) => a.id === app.profile_id)) redirect(`/admin/alchemists/${encodeURIComponent(app.profile_id)}`); // already made: never a duplicate

  const { form, source } = draftFromApplication(app.data, content.modalities);
  const v = validateAlchemist(form, null, { alchemists: content.alchemists, modalities: content.modalities });
  if (!v.valid) back('draft_error=' + encodeURIComponent(Object.values(v.errors)[0]));
  const record = { ...v.record, source: { ...source, application_id: app.id } };
  await store.put('alchemists', record);
  await store.put('applications', { ...app, profile_id: record.id });
  await audit(me, 'profile_draft_created', record.id, `Created a draft profile for ${record.name} from an application`);
  refreshAll();
  redirect(`/admin/alchemists/${encodeURIComponent(record.id)}?created=1`);
}

/* ---------- two-step sign-in ---------- */
const clearPending = () => cookies().set(PENDING_COOKIE, '', { ...cookieOptions, maxAge: 0 });

/** The second page of signing in: the code from the app (or a recovery code). */
export async function secondStepAction(formData) {
  if (!adminConfigured()) redirect('/admin/login?e=config');
  const store = getStore();
  const who = await readSession(cookies().get(PENDING_COOKIE)?.value, pendingSecret(process.env.ADMIN_SESSION_SECRET || ''));
  if (!store || !who) redirect('/admin/login?e=expired');
  const address = clientKey(headers());
  if (!(await secondStepByAddress.check(address)).ok || !(await secondStepByAccount.check(who.sub)).ok) { clearPending(); redirect('/admin/login?e=wait'); }
  const result = await checkSecondFactor(store, who.sub, text(formData, 'code'));
  if (!result.ok) redirect('/admin/login/code?e=bad');
  const acct = await activeAccount(store, who.sub);
  if (!acct) { clearPending(); redirect('/admin/login?e=bad'); }
  await touchLogin(store, acct.id);
  await secondStepByAccount.reset(who.sub);
  await loginByAddress.reset(address);
  await loginByEmail.reset(acct.email);
  clearPending();
  cookies().set(SESSION_COOKIE, await createSession(process.env.ADMIN_SESSION_SECRET, 8 * 3600, Date.now(), { sub: acct.id, role: acct.role }), { ...cookieOptions, maxAge: 8 * 3600 });
  await audit({ id: acct.id, name: acct.name, role: acct.role }, 'sign_in', acct.id, result.via === 'recovery' ? `Signed in with a recovery code (${result.remaining} left)` : 'Signed in with two-step');
  redirect('/admin');
}

const accountBack = (q) => redirect(`/admin/account?${q}`);

export async function startTwoStepAction() {
  const me = await requireAdmin();
  if (me.id === 'bootstrap') accountBack('error=' + encodeURIComponent('Create your own account first.'));
  const r = await beginTotp(needStore(), me.id);
  if (!r.ok && r.reason === 'already_on') accountBack('error=' + encodeURIComponent('Two-step sign-in is already on.'));
  revalidatePath('/admin/account');
  accountBack('setup=1');
}

export async function cancelTwoStepAction() {
  const me = await requireAdmin();
  await cancelTotp(needStore(), me.id);
  revalidatePath('/admin/account');
  accountBack('x=1');
}

/** Used with useFormState: returns an error, or the recovery codes (shown once). */
export async function confirmTwoStepAction(_prev, formData) {
  const me = await requireAdmin();
  const store = needStore();
  if (!(await passwordChange.check(`2fa:${me.id}`)).ok) return { error: 'Too many attempts. Please wait a few minutes.', codes: null };
  const r = await confirmTotp(store, me.id, text(formData, 'code'));
  if (!r.ok) return { error: r.reason === 'bad_code' ? 'That code did not match. Check the time on your phone and try the newest code.' : 'Start the setup again.', codes: null };
  await audit(me, 'two_step_changed', me.id, 'Turned on two-step sign-in');
  // No revalidatePath here: refreshing the page would swap this form for the "it is on" view and hide the recovery codes.
  return { error: null, codes: r.recoveryCodes };
}

export async function disableTwoStepAction(formData) {
  const me = await requireAdmin();
  const store = needStore();
  if (!(await passwordChange.check(`2fa-off:${me.id}`)).ok) accountBack('error=' + encodeURIComponent('Too many attempts. Please wait a few minutes.'));
  if (!(await authenticate(store, me.email, text(formData, 'password'), { touch: false }))) accountBack('error=' + encodeURIComponent('The password is not right.'));
  await disableTotp(store, me.id);
  await audit(me, 'two_step_changed', me.id, 'Turned off two-step sign-in');
  revalidatePath('/admin/account');
  accountBack('off=1');
}

/* ---------- enquiries (owners) ---------- */
export async function updateEnquiryAction(formData) {
  const me = await requireAdmin('enquiries');
  const store = needStore();
  const id = text(formData, 'id');
  const r = await updateEnquiry(store, id, { status: text(formData, 'status'), note: text(formData, 'note'), fee: text(formData, 'fee') });
  const back = (q) => redirect(`/admin/enquiries/${encodeURIComponent(id)}?${q}`);
  if (!r.ok) {
    const msg = { not_found: 'That enquiry no longer exists.', bad_status: 'Choose a valid status.', bad_fee: 'Enter an amount from 0 to 5000.', fee_needs_booked: 'An amount can only be added once the status is "Booked a session".' }[r.reason] ?? 'That did not work.';
    if (r.reason === 'not_found') redirect('/admin/enquiries?error=' + encodeURIComponent(msg));
    back('error=' + encodeURIComponent(msg));
  }
  await audit(me, 'enquiry_updated', id, `Marked an enquiry for ${r.record.alchemist_name} as ${ENQUIRY_LABEL[r.record.status]}`);
  revalidatePath('/admin/enquiries');
  back('saved=1');
}

export async function deleteEnquiryAction(formData) {
  const me = await requireAdmin('enquiries');
  const store = needStore();
  const id = text(formData, 'id');
  await store.remove('enquiries', id);
  await audit(me, 'enquiry_deleted', id, 'Deleted an enquiry');
  revalidatePath('/admin/enquiries');
  redirect('/admin/enquiries?saved=1');
}

export async function setRateAction(formData) {
  const me = await requireAdmin('enquiries');
  const r = await setRatePercent(needStore(), text(formData, 'rate'));
  if (!r.ok) redirect('/admin/enquiries?error=' + encodeURIComponent('Enter a percentage from 0 to 30.'));
  await audit(me, 'commission_rate_set', 'commission', `Set the illustration rate to ${Math.round(r.rate * 1000) / 10}%`);
  revalidatePath('/admin/enquiries');
  redirect('/admin/enquiries?saved=1');
}
