import { DEMO, DEMO_LABEL } from '@/lib/demo';

/** Fixed label shown on every page in demo mode. */
export default function DemoBanner() {
  if (!DEMO) return null;
  return (
    <div role="note" className="demo-banner">
      <strong>{DEMO_LABEL}</strong>
      <span>Alchemists, sessions and resources are fictional. Nothing can be booked or sent.</span>
    </div>
  );
}
