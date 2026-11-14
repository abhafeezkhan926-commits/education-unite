import Image from 'next/image';
import Link from 'next/link';
import PracticeCards from './practice-cards';
import './welcome.css';

export default function Home() {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <Link className="header-brand" href="/">
            <Image src="/educationunite-mark.png" alt="" width={36} height={36} unoptimized />
            EducationUnite
          </Link>
          <nav className="student-links" aria-label="Student access">
            <Link className="student-button header-join-button" href="/join">Join with a code</Link>
            <Link className="student-button sign-in-button" href="/login">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="welcome-main">
        <section className="welcome-intro">
          <h1>Personal GCSE maths practice</h1>
          <p>Practise with questions based on the things you enjoy.</p>
          <Link className="student-button" href="/join">Join with a code</Link>
          <a className="welcome-scroll-link" href="#how-it-works">See how it works ↓</a>
        </section>
        <PracticeCards />
      </main>
    </div>
  );
}
