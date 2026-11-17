'use server';

import { adminSignIn } from './admin-actions';
import { signIn } from './student-actions';

export async function login(previous, form) {
  const identifier = String(form.get('identifier') ?? '').trim();
  if (identifier.includes('@')) {
    form.set('email', identifier);
    return adminSignIn(previous, form);
  }
  form.set('username', identifier);
  return signIn(previous, form);
}
