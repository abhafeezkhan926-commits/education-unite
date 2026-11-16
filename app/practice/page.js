import StudentBackdrop from '../student-backdrop';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { updatePractice } from '../practice-actions';
import { currentPractice } from '../practice-state';
import TypingText from './typing-text';
import PracticeSubmitButton from './submit-button';
import { typingDuration } from './typing-duration';

function WorkedSolution({ answer, question }) {
  const feedback = `${answer.correct ? 'Correct!' : 'Incorrect.'} Your answer: ${answer.value}`;
  let delay = 0;
  function line(text) {
    const start = delay;
    delay += typingDuration(text) + 55;
    return <TypingText text={text} delay={start} animate />;
  }

  return (
    <section className="worked-solution" aria-labelledby="solution">
      <p>{line(feedback)}</p>
      <h2 id="solution">{line('Worked solution')}</h2>
      <ol>{question.solution.map((step, index) => <li key={index}>{line(step)}</li>)}</ol>
      <h3>{line('Where you will use this')}</h3>
      <p>{line(question.use)}</p>
    </section>
  );
}

function PracticeForm({ practice, operation, children }) {
  return (
    <form className="student-form" action={updatePractice} noValidate={operation === 'hint'}>
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
  const nonce = (await headers()).get('x-csp-nonce') ?? undefined;
  const answerError = {
    fraction: 'Enter a fraction, for example 2/15.',
    standard: 'Enter a number in standard form, for example 1.2 × 10^5.',
  }[question.format] ?? 'Enter your answer as a number.';
  const invalidNumber = (await searchParams).error === 'number';

  return (
    <>
      <StudentBackdrop />
      <main className="student-card practice-card">
        <noscript><style nonce={nonce}>{'.practice-typing-unrevealed { visibility: visible; }'}</style></noscript>
        <p>Question {state.position + 1} of {state.questions.length} · {question.interest}</p>
        <h1>Maths practice</h1>
        <p className="question-prompt">{question.prompt}</p>
        {state.hints > 0 && (
          <section aria-label="Hints" key={`${practice.id}:${state.position}:hints`}>
            <ol>
              {question.hints.slice(0, state.hints).map((hint, index) => (
                <li key={index}><TypingText text={hint} animate={!answer && index === state.hints - 1} /></li>
              ))}
            </ol>
          </section>
        )}
        {answer ? (
          <>
            <WorkedSolution key={`${practice.id}:${state.position}:solution`} answer={answer} question={question} />
            <PracticeForm practice={practice} operation="next">
              <button>{last ? 'See my summary' : 'Next question'}</button>
            </PracticeForm>
          </>
        ) : (
          <>
            {state.hints < question.hints.length && (
              <PracticeForm practice={practice} operation="hint">
                <input type="hidden" name="hints" value={state.hints} />
                <PracticeSubmitButton className="sign-in-button" formNoValidate pendingLabel="Loading hint…">
                  Show hint {state.hints + 1} of {question.hints.length}
                </PracticeSubmitButton>
              </PracticeForm>
            )}
            <PracticeForm practice={practice} operation="answer">
              <label>Your answer ({question.unit})
                <input name="answer" inputMode={question.format && question.format !== 'decimal' ? 'text' : 'decimal'}
                  autoComplete="off" required maxLength={32} />
              </label>
              {invalidNumber && <p className="form-error" role="alert">{answerError}</p>}
              <PracticeSubmitButton pendingLabel="Checking answer…">Check answer</PracticeSubmitButton>
            </PracticeForm>
          </>
        )}
      </main>
    </>
  );
}
