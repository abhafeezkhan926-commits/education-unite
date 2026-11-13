import { randomInt } from 'node:crypto';
import templates from './practice-templates.json';
import { answerRules, validateTemplates } from './practice-template-schema.mjs';

export { interests } from './practice-template-schema.mjs';

const templatesByInterest = validateTemplates(templates);
const questionCount = 6;

function generateQuestion(template, interest, position) {
  const a = randomInt(3 + 2 * position, 5 + 2 * position);
  const b = template.rule === 'percentage' ? 20 * randomInt(1, 5) : randomInt(12, 30);
  const c = template.rule === 'percentage' ? 5 * randomInt(1, 7) : randomInt(2, 10);
  const values = { a, b, c, total: a * b };
  const expected = answerRules[template.rule](values);
  const substitutions = { ...values, answer: expected };
  const fill = (text) => text.replace(/\{(\w+)\}/g, (_, name) => String(substitutions[name]));

  return {
    prompt: fill(template.prompt),
    unit: template.unit,
    expected,
    hints: template.hints.map(fill),
    solution: template.solution.map(fill),
    use: fill(template.use),
    interest: interest.label,
  };
}

export function makeQuestions(selected) {
  const firstTemplate = randomInt(3);
  return Array.from({ length: questionCount }, (_, position) => {
    const interestIndex = position % selected.length;
    const interest = selected[interestIndex];
    const templates = templatesByInterest.get(interest.id);
    const round = Math.floor(position / selected.length);
    const template = templates[(firstTemplate + interestIndex + round) % templates.length];
    return generateQuestion(template, interest, position);
  });
}
