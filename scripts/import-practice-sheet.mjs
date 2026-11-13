import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateTemplates } from '../app/practice-template-schema.mjs';

const [input] = process.argv.slice(2);
if (!input) throw new Error('Usage: node scripts/import-practice-sheet.mjs <workbook.xlsx>');

const moduleDir = process.env.EDUCATION_UNITE_ARTIFACT_MODULES;
const require = createRequire(moduleDir ? resolve(moduleDir, '..', 'practice-import.cjs') : import.meta.url);
const { FileBlob, SpreadsheetFile } = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(resolve(input)));
const [headings, ...rows] = workbook.worksheets.getItem('Templates').getUsedRange().values;
const columns = [
  'ID', 'Interest', 'Answer rule', 'Unit', 'Question', 'Hint 1', 'Hint 2',
  'Hint 3', 'Solution 1', 'Solution 2', 'Where you will use this',
];
const positions = columns.map((name) => {
  const index = headings.indexOf(name);
  if (index < 0 || index !== headings.lastIndexOf(name)) throw new Error(`Expected one column named "${name}".`);
  return index;
});
const templates = rows.filter((row) => row.some((cell) => String(cell ?? '').trim())).map((row) => {
  const [id, interest, rule, unit, prompt, hint1, hint2, hint3, step1, step2, use] =
    positions.map((position) => String(row[position] ?? '').trim());
  return { id, interest, rule, unit, prompt, hints: [hint1, hint2, hint3].filter(Boolean),
    solution: [step1, step2].filter(Boolean), use };
});

validateTemplates(templates);
await writeFile(new URL('../app/practice-templates.json', import.meta.url), JSON.stringify(templates, null, 2) + '\n');
console.log(`Imported ${templates.length} practice templates.`);
