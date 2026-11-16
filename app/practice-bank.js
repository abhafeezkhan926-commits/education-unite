import { randomInt } from 'node:crypto';
import templates from './practice-templates.json';
import { compileWorkbookTemplate, workbookInterests as interests } from './workbook-templates.mjs';

export { interests };

const templatesByInterest = new Map(interests.map(({ id }) => [id, []]));
for (const template of templates) {
  templatesByInterest.get(template.interest).push({
    ranges: Object.entries(template.ranges),
    generate: compileWorkbookTemplate(template),
  });
}

export function makeQuestions(selected) {
  const offsets = selected.map(({ id }) => randomInt(templatesByInterest.get(id).length));
  return Array.from({ length: 6 }, (_, position) => {
    const interestIndex = position % selected.length;
    const interest = selected[interestIndex];
    const options = templatesByInterest.get(interest.id);
    const round = Math.floor(position / selected.length);
    const { ranges, generate } = options[(offsets[interestIndex] + round) % options.length];
    const numbers = Object.fromEntries(ranges.map(([name, values]) => [name, values[randomInt(values.length)]]));
    return { ...generate(numbers), interest: interest.label };
  });
}
