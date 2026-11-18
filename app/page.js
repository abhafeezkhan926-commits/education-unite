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
            <Link className="student-button secondary-button" href="/login">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="welcome-main">
        <PracticeCards />
        <section className="welcome-steps" aria-labelledby="welcome-steps-heading">
          <h2 id="welcome-steps-heading">How it works</h2>
          <ol>
            <li>Join with your class code</li>
            <li>Choose your interests</li>
            <li>Practise six maths questions</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
