import Image from 'next/image';
import Link from 'next/link';

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
      <main>
        <h1>GCSE maths practice built around your interests.</h1>
      </main>
    </div>
  );
}
