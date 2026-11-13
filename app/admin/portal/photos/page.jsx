import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { getBlobStore } from '@/lib/images/blobs.mjs';
import PhotoManager from '@/components/admin/PhotoManager';
import { portalUploadPhotoAction, portalPhotoAction } from '../../actions';

export const metadata = { title: 'Your photos' };

export default async function PortalPhotos({ searchParams }) {
  const me = await requirePortal();
  const profile = (await loadContent()).alchemists.find((a) => a.id === me.profile_id);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <h1 style={{ fontSize: '2.2rem' }}>Your photos</h1>
      <PhotoManager alchemist={profile} mode="portal" enabled={Boolean(getBlobStore())} error={searchParams?.photo_error} saved={Boolean(searchParams?.photo_saved)} uploadAction={portalUploadPhotoAction} changeAction={portalPhotoAction} />
    </div>
  );
}
