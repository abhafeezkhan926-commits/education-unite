import { connection } from 'next/server';
import './globals.css';

export const metadata = {
  title: 'EducationUnite',
  description: 'GCSE maths practice built around your interests.',
  icons: { icon: { url: '/educationunite-favicon.svg', type: 'image/svg+xml', sizes: 'any' } },
};

export default async function RootLayout({ children }) {
  await connection();
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
