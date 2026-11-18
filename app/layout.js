import { connection } from 'next/server';
import localFont from 'next/font/local';
import './globals.css';

const nunito = localFont({
  src: './fonts/nunito-latin.woff2',
  weight: '400 900',
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata = {
  title: 'EducationUnite',
  description: 'GCSE maths practice built around your interests.',
  icons: { icon: { url: '/educationunite-favicon.svg', type: 'image/svg+xml', sizes: 'any' } },
};

export default async function RootLayout({ children }) {
  await connection();
  return (
    <html lang="en-GB" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
