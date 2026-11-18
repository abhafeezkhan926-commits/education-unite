import { compileArithmetic, matchesAnswer, roundDecimal, standardForm } from './workbook-arithmetic.mjs';

export const workbookInterests = [
  { id: 'shopping', label: 'Shopping and finance' },
  { id: 'pop-culture', label: 'Pop culture' },
  { id: 'music', label: 'Music and streaming' },
];

const displayNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 });
const displayMoney = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

export function singulariseSolution(line) {
  return line.replace(/(?<![\d.,])\b1 (lots of|weeks\b)/g, (_, phrase) =>
    phrase === 'lots of' ? '1 lot of' : '1 week');
}

export function parseRanges(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => {
    const [name, description] = line.split(': ');
    const range = /^(\d+) to (\d+), (?:step (\d+)|whole numbers)$/.exec(description.replace(/,(?=\d)/g, ''));
    if (/^[a-e]$/.test(name) && range) {
      const first = Number(range[1]);
      const last = Number(range[2]);
      const step = Number(range[3] ?? 1);
      if (step && last >= first && last - first <= 100000 && (last - first) % step === 0 && (last - first) / step < 100) {
        return [name, Array.from({ length: (last - first) / step + 1 }, (_, index) => first + index * step)];
      }
    }
    if (/^[a-e]$/.test(name) && /^one of \d+(, \d+)*$/.test(description)) {
      return [name, description.slice(7).split(', ').map(Number)];
    }
    throw new Error(`Invalid workbook number range: ${line}`);
  }));
}

function fractionText(value) {
  for (let denominator = 1; denominator <= 1000; denominator++) {
    const numerator = Math.round(value * denominator);
    if (matchesAnswer(numerator / denominator, value)) return `${numerator}/${denominator}`;
  }
  throw new Error('Workbook probability has no supported fraction.');
}

export function compileWorkbookTemplate(template) {
  const { ranges, formula, format, places, prompt, hints, solution, use } = template;
  const variables = Object.keys(ranges);
  const calculate = compileArithmetic(formula, variables);
  function compileText(source) {
    const substitutions = [...source.matchAll(/\{([^{}]+)\}/g)].map(([, expression]) => {
      if (expression === 'sf') return ({ answer }) => standardForm(answer);
      if (expression === 'answer' && format === 'fraction') return ({ answer }) => fractionText(answer);
      const [math, modifier] = expression.split(':');
      if (modifier && modifier !== 'm') throw new Error(`Unknown workbook format: ${expression}`);
      const evaluate = compileArithmetic(math, [...variables, 'answer']);
      const formatter = modifier === 'm' ? displayMoney : displayNumber;
      const digits = modifier === 'm' ? 2 : 6;
      return (values) => formatter.format(roundDecimal(evaluate(values), digits));
    });
    return (values) => {
      let index = 0;
      return source.replace(/\{[^{}]+\}/g, () => substitutions[index++](values));
    };
  }
  const renderPrompt = compileText(prompt);
  const renderHints = hints.map(compileText);
  const renderSolution = solution.map(compileText);
  const renderUse = compileText(use);
  return (numbers) => {
    const result = calculate(numbers);
    if (!Number.isFinite(result)) throw new Error(`Non-finite workbook answer: ${template.id}`);
    const expected = places === null ? result : roundDecimal(result, places);
    const values = { ...numbers, answer: expected };
    return {
      prompt: renderPrompt(values),
      hints: renderHints.map((render) => render(values)),
      solution: renderSolution.map((render) => singulariseSolution(render(values))),
      use: renderUse(values),
      unit: template.unit,
      format,
      expected,
    };
  };
}
