import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import readExcelFile from 'read-excel-file/node';
import { matchesAnswer, parsePracticeAnswer } from '../app/workbook-arithmetic.mjs';
import { compileWorkbookTemplate, parseRanges, workbookInterests } from '../app/workbook-templates.mjs';

const [input, option] = process.argv.slice(2);
if (!input || (option && option !== '--check')) {
  throw new Error('Usage: node scripts/import-practice-sheet.mjs <workbook.xlsx> [--check]');
}

const sheets = await readExcelFile(resolve(input));
const sheet = sheets.find(({ sheet }) => sheet === 'Templates');
if (!sheet?.data.length) throw new Error('Expected a non-empty Templates worksheet.');
const [headings, ...rows] = sheet.data;
const bankFile = new URL('../app/practice-templates.json', import.meta.url);
const columns = [
  'ID', 'Interest', 'Question text', 'Range for each number', 'Answer formula',
  'Hint 1', 'Hint 2', 'Hint 3', 'Worked solution steps', 'Where you will use this',
  'Answer format', 'Example numbers', 'Example answer',
];
const positions = columns.map((name) => {
  const index = headings.indexOf(name);
  if (index < 0 || index !== headings.lastIndexOf(name)) throw new Error(`Expected one column named "${name}".`);
  return index;
});

const ids = new Set();
const templates = rows.filter((row) => row.some((cell) => String(cell ?? '').trim())).map((row) => {
  const [id, label, prompt, range, formula, hint1, hint2, hint3, steps, use, unit, exampleNumbers, exampleAnswer] =
    positions.map((position) => String(row[position] ?? '').trim());
  const interest = workbookInterests.find(({ label: name }) => name === label)?.id;
  if (!id || ids.has(id) || !interest || !prompt || !range || !formula || !hint1 || !hint2 || !hint3 || !steps || !use || !unit) {
    throw new Error(`Missing or invalid workbook content for ${id || '(missing ID)'}.`);
  }
  ids.add(id);
  const ranges = parseRanges(range);
  const format = unit.startsWith('fraction') ? 'fraction' : unit.startsWith('standard form') ? 'standard' : 'decimal';
  const places = format === 'decimal' ? Number(unit.match(/(\d) decimal place/)?.[1] ?? 0) : null;
  const solution = steps.split(/\r?\n/).map((line) => line.replace(/^\d+\.\s+/, ''));
  const template = { id, interest, prompt, ranges, formula, hints: [hint1, hint2, hint3], solution, use, unit, format, places };
  const numbers = Object.fromEntries([...exampleNumbers.matchAll(/([a-e])=([\d,]+)/g)]
    .map(([, name, value]) => [name, Number(value.replaceAll(',', ''))]));
  if (Object.keys(numbers).length !== Object.keys(ranges).length ||
      !Object.entries(ranges).every(([name, values]) => values.includes(numbers[name]))) {
    throw new Error(`Invalid example values for ${id}.`);
  }
  const generate = compileWorkbookTemplate(template);
  const expectedText = exampleAnswer.replace(/[£,]/g, '').match(
    format === 'standard' ? /^[\d.]+\s*×\s*10\^[+-]?\d+/ : format === 'fraction' ? /^\d+\/\d+/ : /^[+-]?[\d.]+/,
  )?.[0];
  const result = generate(numbers);
  if (!expectedText || !matchesAnswer(parsePracticeAnswer(expectedText, format), result.expected)) {
    throw new Error(`Example answer mismatch for ${id}: workbook "${exampleAnswer}", generated ${result.expected}.`);
  }
  return template;
});

for (const { id } of workbookInterests) {
  const count = templates.filter(({ interest }) => interest === id).length;
  if (count !== 8) throw new Error(`Expected 8 workbook templates for ${id}, found ${count}.`);
}
const content = JSON.stringify(templates, null, 2) + '\n';
if (option === '--check') {
  if (await readFile(bankFile, 'utf8').then((value) => value.replaceAll('\r\n', '\n')) !== content) {
    throw new Error('Workbook validates but differs from the generated question bank. Run the importer to update it.');
  }
} else {
  await writeFile(bankFile, content);
}
console.log(`${option === '--check' ? 'Validated' : 'Imported'} ${templates.length} practice templates and their example answers.`);
