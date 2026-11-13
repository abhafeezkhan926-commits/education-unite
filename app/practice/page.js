import { redirect } from 'next/navigation';
import { updatePractice } from '../practice-actions';
import { currentPractice } from '../practice-state';

function PracticeForm({ practice, operation, children }) {
  return (
    <form className="student-form" action={updatePractice}>
      <input type="hidden" name="practice" value={practice.id} />
      <input type="hidden" name="position" value={practice.state.position} />
      <input type="hidden" name="operation" value={operation} />
      {children}
    </form>
  );
}

export default async function Practice({ searchParams }) {
  const practice = await currentPractice();
  if (!practice) redirect('/interests');
  const { state } = practice;
  if (state.summary) redirect('/practice/summary');
  const question = state.questions[state.position];
  const answer = state.answers[state.position];
  const last = state.position + 1 === state.questions.length;
  const invalidNumber = (await searchParams).error === 'number';

  return (
    <main className="student-card practice-card">
      <p>Question {state.position + 1} of {state.questions.length} · {question.interest}</p>
      <h1>Maths practice</h1>
      <p className="question-prompt">{question.prompt}</p>
      {state.hints > 0 && (
        <section aria-label="Hints">
          <ol>{question.hints.slice(0, state.hints).map((hint) => <li key={hint}>{hint}</li>)}</ol>
        </section>
      )}
      {answer ? (
        <>
          <section className="worked-solution" aria-labelledby="solution">
            <p><strong>{answer.correct ? 'Correct!' : 'Incorrect.'}</strong> Your answer: {answer.value}</p>
            <h2 id="solution">Worked solution</h2>
            <ol>{question.solution.map((step) => <li key={step}>{step}</li>)}</ol>
            <h3>Where you will use this</h3>
            <p>{question.use}</p>
          </section>
          <PracticeForm practice={practice} operation="next">
            <button>{last ? 'See my summary' : 'Next question'}</button>
          </PracticeForm>
        </>
      ) : (
        <>
          {state.hints < question.hints.length && (
            <PracticeForm practice={practice} operation="hint">
              <input type="hidden" name="hints" value={state.hints} />
              <button className="sign-in-button">Show hint {state.hints + 1} of {question.hints.length}</button>
            </PracticeForm>
          )}
          <PracticeForm practice={practice} operation="answer">
            <label>Your answer ({question.unit})
              <input name="answer" inputMode="decimal" autoComplete="off" required maxLength={20} />
            </label>
            {invalidNumber && <p className="form-error" role="alert">Enter your answer as a number.</p>}
            <button>Check answer</button>
          </PracticeForm>
        </>
      )}
    </main>
  );
}
