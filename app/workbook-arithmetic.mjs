const functions = {
  MIN: Math.min,
  MAX: Math.max,
  PI: () => Math.PI,
  ROUND: roundDecimal,
  ROUNDUP: (value, places) => Math.sign(value) * Math.ceil(Math.abs(value) * 10 ** places) / 10 ** places,
  ROUNDDOWN: (value, places) => Math.trunc(value * 10 ** places) / 10 ** places,
};

export function roundDecimal(value, places) {
  const scale = 10 ** places;
  const scaled = Math.abs(value) * scale;
  return Math.sign(value) * Math.round(scaled + Number.EPSILON * scaled) / scale;
}

export function compileArithmetic(source, variables) {
  const tokens = source.match(/\s+|\d+(?:\.\d+)?|[A-Za-z]+|[-+*/^(),]|./gu)
    ?.filter((token) => token.trim()) ?? [];
  let position = 0;
  const fail = () => { throw new Error(`Invalid workbook expression: ${source}`); };
  const take = (expected) => { if (tokens[position++] !== expected) fail(); };
  const precedence = new Map([['+', 1], ['-', 1], ['*', 2], ['/', 2], ['^', 3]]);
  const operations = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '^': (a, b) => a ** b,
  };

  function operand() {
    const token = tokens[position++];
    if (token === '(') {
      const nested = expression();
      take(')');
      return nested;
    }
    if (token === '-' || token === '+') {
      const value = expression(3);
      return (values) => token === '-' ? -value(values) : value(values);
    }
    if (/^\d+(?:\.\d+)?$/.test(token ?? '')) return () => Number(token);
    if (variables.includes(token)) return (values) => values[token];
    if (!Object.hasOwn(functions, token)) fail();
    take('(');
    const args = [];
    if (tokens[position] !== ')') {
      do {
        args.push(expression());
      } while (tokens[position] === ',' && ++position);
    }
    take(')');
    return (values) => functions[token](...args.map((arg) => arg(values)));
  }

  function expression(minimum = 1) {
    let result = operand();
    while ((precedence.get(tokens[position]) ?? 0) >= minimum) {
      const operator = tokens[position++];
      const left = result;
      const right = expression(precedence.get(operator) + (operator === '^' ? 0 : 1));
      result = (values) => operations[operator](left(values), right(values));
    }
    return result;
  }

  const evaluate = expression();
  if (position !== tokens.length) fail();
  return evaluate;
}

export function standardForm(value) {
  const [coefficient, exponent] = value.toExponential().split('e');
  return `${coefficient} × 10^${Number(exponent)}`;
}

export function parsePracticeAnswer(value, format) {
  const normalised = value.trim().replace(/^([+-]?)£\s*/, '$1')
    .replace(/\d+(?:,\d{3})+(?!\d)/g, (number) => number.replaceAll(',', ''));
  const compact = normalised.replace(/\s+/g, '');
  const decimal = /^[+-]?\d{1,12}(?:\.\d{1,6})?$/;
  if (format === 'fraction') {
    const fraction = /^([+-]?\d{1,9})\/(\d{1,9})$/.exec(compact);
    return fraction && Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
  }
  if (format === 'standard') {
    const exponent = /^([+-]?\d{1,12}(?:\.\d{1,6})?)(?:e|[×x*]10\^)([+-]?\d{1,2})$/i.exec(compact);
    if (exponent) return Number(`${exponent[1]}e${exponent[2]}`);
  }
  return decimal.test(normalised) ? Number(normalised) : null;
}

export function matchesAnswer(actual, expected) {
  return Number.isFinite(actual) &&
    Math.abs(actual - expected) <= Number.EPSILON * Math.max(1, Math.abs(expected));
}
