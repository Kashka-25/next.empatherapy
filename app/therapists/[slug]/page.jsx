import { notFound } from 'next/navigation';
import { therapists, getTherapistBySlug } from '@/lib/data';
import TherapistProfile from '@/components/therapists/TherapistProfile';

export async function generateStaticParams() {
  return therapists.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }) {
  const t = getTherapistBySlug(params.slug);
  if (!t) return {};
  return {
    title: `${t.name} | Empatherapy`,
    description: t.shortBio,
  };
}

export default function TherapistPage({ params }) {
  const therapist = getTherapistBySlug(params.slug);
  if (!therapist) notFound();

  return (
    <div style={{ paddingTop: '72px' }}>
      <TherapistProfile therapist={therapist} />
    </div>
  );
}
