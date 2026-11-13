export const interests = [
  { id: 'gaming', label: 'Gaming and streaming' },
  { id: 'sport', label: 'Sport' },
  { id: 'music', label: 'Music' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'technology', label: 'Technology' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'pop-culture', label: 'Pop culture' },
  { id: 'beauty', label: 'Beauty and make-up' },
];

export const answerRules = {
  multiply: ({ total }) => total,
  remaining: ({ total, c }) => total - c,
  percentage: ({ total, c }) => total * c / 100,
};

export function validateTemplates(templates) {
  const byInterest = new Map(interests.map(({ id }) => [id, []]));
  const ids = new Set();

  for (const template of templates) {
    const { id, interest, rule, unit, prompt, hints, solution, use } = template;
    const validText = (value) => typeof value === 'string' && value.trim().length > 0;
    const requiredVariables = rule === 'multiply' ? ['a', 'b'] : ['a', 'b', 'c'];
    const displayedText = [prompt, ...hints, ...solution, use];
    const invalidPlaceholder = (value) =>
      /[{}]/.test(value.replace(/\{(?:a|b|c|total|answer)\}/g, ''));

    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id) || !byInterest.has(interest) ||
        !Object.hasOwn(answerRules, rule) || !validText(unit) || !displayedText.every(validText) ||
        displayedText.some(invalidPlaceholder) || hints.length > 3 || !solution.length ||
        !requiredVariables.every((variable) => prompt.includes(`{${variable}}`)) ||
        /\{(?:total|answer)\}/.test(prompt) || hints.some((hint) => hint.includes('{answer}')) ||
        !solution.some((step) => step.includes('{answer}'))) {
      throw new Error(`Invalid question template: ${id || '(missing ID)'}`);
    }
    ids.add(id);
    byInterest.get(interest).push(template);
  }

  for (const [interest, entries] of byInterest) {
    if (entries.length !== 3) throw new Error(`Expected 3 templates for ${interest}, got ${entries.length}.`);
  }
  return byInterest;
}
