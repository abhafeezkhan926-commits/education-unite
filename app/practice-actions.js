'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { interests, makeQuestions } from './practice-bank';
import { readPractice } from './practice-state';
import { withStudent } from './student-session';

export async function startPractice(_previous, form) {
  const selectedIds = form.getAll('interest');
  const selected = interests.filter(({ id }) => selectedIds.includes(id));
  if (selected.length < 1 || selected.length > 3 || selected.length !== selectedIds.length) {
    return { error: 'Choose 1 to 3 interests to continue.' };
  }

  await withStudent(async (db, _student, tokenDigest) => {
    await db.query('select education_unite.clear_expired_practice()');
    const state = {
      startedAt: Date.now(),
      questions: makeQuestions(selected),
      position: 0,
      hints: 0,
      answers: [],
    };
    await db.query(
      `insert into education_unite.active_practice as active (token_digest, id, expires_at, state)
       values ($1, $2, now() + interval '2 hours', $3)
       on conflict (token_digest) do update
       set id = excluded.id, expires_at = excluded.expires_at, state = excluded.state
       where active.expires_at <= now() or active.state ? 'summary'`,
      [tokenDigest, randomUUID(), JSON.stringify(state)],
    );
  });
  redirect('/practice');
}

async function completePractice(db, studentId, id, state) {
  const duration = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  await db.query(
    'insert into education_unite.practice_sessions (id, student_id, duration_seconds) values ($1, $2, $3)',
    [id, studentId, duration],
  );
  for (const [position, answer] of state.answers.entries()) {
    const { prompt, unit, expected } = state.questions[position];
    await db.query(
      `insert into education_unite.practice_answers
         (practice_session_id, question_position, question_snapshot, answer)
       values ($1, $2, $3, $4)`,
      [id, position + 1, JSON.stringify({ prompt, unit, expected }), answer.value],
    );
  }
  const summary = {
    duration,
    total: state.questions.length,
    score: state.answers.filter(({ correct }) => correct).length,
    hints: state.answers.reduce((total, answer) => total + answer.hints, 0),
  };
  await db.query(
    "update education_unite.active_practice set state = $2, expires_at = now() + interval '15 minutes' where id = $1",
    [id, JSON.stringify({ summary })],
  );
}

export async function updatePractice(form) {
  const destination = await withStudent(async (db, student, tokenDigest) => {
    const practice = await readPractice(db, tokenDigest, true);
    if (!practice) return '/interests';
    const { id, state } = practice;
    if (state.summary) return '/practice/summary';
    if (form.get('practice') !== id || form.get('position') !== String(state.position)) return '/practice';

    const question = state.questions[state.position];
    const answered = state.answers.length > state.position;
    const operation = form.get('operation');
    if (operation === 'hint' && !answered && form.get('hints') === String(state.hints)) {
      state.hints = Math.min(state.hints + 1, question.hints.length);
    } else if (operation === 'answer' && !answered) {
      const value = String(form.get('answer') ?? '').trim();
      if (!/^[+-]?\d{1,12}(?:\.\d{1,6})?$/.test(value)) return '/practice?error=number';
      state.answers.push({ value, correct: Number(value) === question.expected, hints: state.hints });
    } else if (operation === 'next' && answered) {
      if (state.position + 1 === state.questions.length) {
        await completePractice(db, student.id, id, state);
        return '/practice/summary';
      }
      state.position += 1;
      state.hints = 0;
    } else {
      return '/practice';
    }

    await db.query('update education_unite.active_practice set state = $2 where id = $1', [id, JSON.stringify(state)]);
    return '/practice';
  });
  redirect(destination);
}
