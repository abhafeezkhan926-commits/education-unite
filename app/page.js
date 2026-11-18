import Brand from './brand';
import Link from 'next/link';
import PracticeCards from './practice-cards';
import './welcome.css';

export default function Home() {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <Brand />
          <nav className="student-links" aria-label="Account access">
            <Link className="student-button secondary-button header-join-button" href="/join">Join with a code</Link>
            <Link className="student-button secondary-button" href="/login">Login</Link>
          </nav>
        </div>
      </header>
      <main className="welcome-main">
        <PracticeCards />
      </main>
    </div>
  );
}
