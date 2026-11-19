'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { withAdmin } from '../admin-auth';
import { digest } from '../student-security';
import { readGender, validUsername, validStudentId } from '../student-profile.mjs';

function refresh() {
  revalidatePath('/admin/students');
}

export async function addStudent(_previous, form) {
  const gender = readGender(form.get('gender'));
  if (gender === undefined) return { error: 'Choose a valid gender option.' };
  const result = await withAdmin(async (db) => {
    const username = 'learner' + randomBytes(6).toString('hex');
    const value = randomBytes(16).toString('base64url');
    await db.query(
      `insert into education_unite.students (username, password_hash, gender)
       values ($1, 'reset-required', $2)`, [username, gender],
    );
    const { rows: [{ deadline }] } = await db.query(
      'select education_unite.issue_student_reset($1, $2) as deadline',
      [username, digest('student-reset', value)],
    );
    return { username, value, expiresAt: new Date(deadline).toISOString() };
  });
  refresh();
  return result;
}

export async function editStudent(_previous, form) {
  const id = String(form.get('id') ?? '');
  const username = String(form.get('username') ?? '').trim().toLowerCase();
  const gender = readGender(form.get('gender'));
  if (!validStudentId(id) || !validUsername(username) || gender === undefined) {
    return { error: 'Use a username with 1–64 letters or numbers and a valid gender option.' };
  }
  try {
    const result = await withAdmin(async (db) => {
      const { rows: [student] } = await db.query('select username from education_unite.students where id = $1', [id]);
      if (!student) return { error: 'This student no longer exists. Refresh the list.' };
      await db.query('select education_unite.lock_student($1)', [student.username]);
      const { rows: [locked] } = await db.query('select username from education_unite.students where id = $1 for update', [id]);
      if (!locked || locked.username !== student.username) return { error: 'Student changed. Refresh and try again.' };
      await db.query('update education_unite.students set username = $2, gender = $3 where id = $1', [id, username, gender]);
      if (student.username !== username) await db.query('delete from education_unite.student_sessions where student_id = $1', [id]);
      return { success: 'Student updated.' };
    });
    refresh();
    if (result.error) return result;
  } catch (error) {
    if (error.code === '23505') return { error: 'That username is already in use.' };
    throw error;
  }
  redirect('/admin/students?status=updated');
}

export async function deleteStudent(_previous, form) {
  const id = String(form.get('id') ?? '');
  const confirmation = String(form.get('confirmation') ?? '').trim();
  if (!validStudentId(id)) return { error: 'Select a valid student.' };
  const result = await withAdmin(async (db) => {
    const { rows: [student] } = await db.query('select username from education_unite.students where id = $1', [id]);
    if (!student) return { error: 'This student no longer exists. Refresh the list.' };
    if (confirmation !== student.username) return { error: 'Type the exact username to confirm deletion.' };
    await db.query('select education_unite.lock_student($1)', [student.username]);
    const { rows: [locked] } = await db.query('select username from education_unite.students where id = $1 for update', [id]);
    if (!locked || locked.username !== student.username) return { error: 'Student changed. Refresh and try again.' };
    await db.query('delete from education_unite.students where id = $1', [id]);
    return { success: 'Student and their practice data deleted.' };
  });
  refresh();
  if (result.error) return result;
  redirect('/admin/students?status=deleted');
}
