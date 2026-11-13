import './globals.css';

export const metadata = {
  title: 'EducationUnite',
  description: 'GCSE maths practice built around your interests.',
  icons: { icon: '/educationunite-mark.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
