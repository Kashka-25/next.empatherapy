import Directory from '@/components/alchemists/Directory';
import Eyebrow from '@/components/ui/Eyebrow';
import { alchemists, modalities } from '@/lib/content.mjs';

export const metadata = {
  title: 'Discover Alchemists',
  description: 'Meet the practitioners of Empatherapy: their stories, philosophies, training and what a session with them is like.',
};

const locations = [
  { value: 'sydney', label: 'Sydney' }, { value: 'melbourne', label: 'Melbourne' }, { value: 'brisbane', label: 'Brisbane' },
  { value: 'perth', label: 'Perth' }, { value: 'blue mountains', label: 'Blue Mountains' },
];

export default function AlchemistsPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Eyebrow>Discover Alchemists</Eyebrow>
          <h1>People, not listings</h1>
          <p className="lede">Each Alchemist shares their story, their philosophy and what brought them to their practice, so you can find someone who feels right, not just someone who fits a category.</p>
          <p className="demo-note" style={{ maxWidth: '44rem' }}>
            Profiles marked <strong>Example</strong> are fictional people created to show how Empatherapy will work. They are not real practitioners and nothing can be booked yet.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          <Directory alchemists={alchemists} modalities={modalities} locations={locations} />
        </div>
      </section>
    </>
  );
}
