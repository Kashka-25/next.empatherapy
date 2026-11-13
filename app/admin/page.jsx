import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore, storeEnabled } from '@/lib/store/index.mjs';
import { listApplications } from '@/lib/applications.mjs';
import { loadFeatures } from '@/lib/features.mjs';
import { activeFeatures } from '@/data/features.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { can, ROLE_LABEL } from '@/lib/accounts.mjs';

export default async function AdminHome({ searchParams }) {
  const me = await requireAdmin();
  const store = getStore();
  const seeApps = can(me.role, 'applications');
  const seeContent = can(me.role, 'content');
  const { alchemists } = await loadContent(store);
  const apps = store && seeApps ? await listApplications(store) : [];
  const features = await loadFeatures(store);
  const live = activeFeatures(new Date(), features);
  const waiting = apps.filter((a) => a.status === 'new').length;

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="stack">
        <h1 style={{ fontSize: '2.4rem' }}>Overview</h1>
        <p className="lede">The behind-the-scenes of Empatherapy. Nothing here is visible to the public.{me.id !== 'bootstrap' ? ` You are signed in as ${me.name} (${ROLE_LABEL[me.role]}).` : ''}</p>
      </div>

      {searchParams?.e === 'forbidden' ? <p className="error" role="alert">Your role does not include that part of the admin.</p> : null}
      {!storeEnabled() ? (
        <p className="demo-note" role="status"><strong>Storage is switched off.</strong> Applications cannot be received and schedules cannot be saved until it is on. For local work set <code>EMPATHERAPY_STORE=file</code> in <code>.env.local</code>. A hosted site uses the Supabase database (see <code>docs/ADMIN.md</code>).{searchParams?.e === 'store' ? ' (That action needs storage.)' : ''}</p>
      ) : null}

      <div className="admin-grid">
        {seeApps ? <Link href="/admin/applications" className="admin-card admin-card--link">
          <span className="eyebrow">Applications</span>
          <strong className="admin-stat">{store ? waiting : '–'}</strong>
          <span>{store ? `waiting for a first look, ${apps.length} in total` : 'storage is off'}</span>
        </Link> : null}
        {seeContent ? <Link href="/admin/features" className="admin-card admin-card--link">
          <span className="eyebrow">Weekly features</span>
          <strong className="admin-stat">{live.length}</strong>
          <span>live this week{store ? '' : ' (sample schedule)'}</span>
        </Link> : null}
        {seeContent ? <Link href="/admin/alchemists" className="admin-card admin-card--link">
          <span className="eyebrow">Alchemists</span>
          <strong className="admin-stat">{alchemists.length}</strong>
          <span>{alchemists.filter((a) => a.demo).length} are fictional examples that must be removed before launch</span>
        </Link> : null}
      </div>

      <section className="admin-card stack">
        <h2 style={{ fontSize: '1.4rem' }}>Still to build</h2>
        <ul className="tick-list">
          <li>Photo uploads for Alchemists.</li>
          <li>Turning an approved application into a profile in one step.</li>
          <li>Homepage content and image management, and reviews moderation once reviews exist.</li>
        </ul>
      </section>
    </div>
  );
}
