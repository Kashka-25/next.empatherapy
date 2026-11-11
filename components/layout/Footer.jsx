import Link from 'next/link';
import { Sprig } from '@/components/art/Botanicals';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="wordmark"><Sprig color="#E8BE67" />Empatherapy</p>
            <p>Discover new pathways to yourself.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link href="/discover">Begin your discovery</Link></li>
              <li><Link href="/alchemists">Discover Alchemists</Link></li>
              <li><Link href="/modalities">Explore Modalities</Link></li>
            </ul>
          </div>
          <div>
            <h4>Connect</h4>
            <ul>
              <li><Link href="/lighthouse">IntoTheLighthouse</Link></li>
              <li><Link href="/become-an-alchemist">Become an Alchemist</Link></li>
              <li><a href="mailto:hello@empatherapy.co">hello@empatherapy.co</a></li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><Link href="/about">Our philosophy</Link></li>
              <li><Link href="/about#how-we-work">How we work</Link></li>
              <li><Link href="/about#safety">Safety</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bar">
          <p>
            <strong>This site is a work in progress.</strong> Profiles marked &ldquo;Example&rdquo; are fictional people
            created to show how Empatherapy will work. Nothing here can be booked yet.
          </p>
          <p>
            Empatherapy offers exploration and connection. It is not emergency or crisis care. If you are in danger
            or need urgent help in Australia, call 000, or Lifeline on 13 11 14.
          </p>
          <p>&copy; 2026 Empatherapy</p>
        </div>
      </div>
    </footer>
  );
}
