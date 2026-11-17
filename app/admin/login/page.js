import { redirect } from 'next/navigation';

export default async function AdminLogin({ searchParams }) {
  const { step } = await searchParams;
  redirect(step === 'email' ? '/login?step=email' : '/login');
}
