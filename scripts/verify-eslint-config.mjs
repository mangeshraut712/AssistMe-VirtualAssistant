import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ESLint } from 'eslint';

assert.ok(existsSync('eslint.config.cjs'), 'The lint migration requires eslint.config.cjs.');

const eslint = new ESLint({ cwd: process.cwd() });
const legacyReactRules = [
    'display-name',
    'jsx-key',
    'jsx-no-comment-textnodes',
    'jsx-no-duplicate-props',
    'jsx-no-target-blank',
    'jsx-no-undef',
    'jsx-uses-vars',
    'no-children-prop',
    'no-danger-with-children',
    'no-deprecated',
    'no-direct-mutation-state',
    'no-find-dom-node',
    'no-is-mounted',
    'no-render-return-value',
    'no-string-refs',
    'no-unknown-property',
    'require-render-return',
];
const legacyCoreErrorRules = [
    'no-extra-semi',
    'no-inner-declarations',
    'no-mixed-spaces-and-tabs',
    'no-new-symbol',
];
const eslint9OnlyRecommendedRules = [
    'no-constant-binary-expression',
    'no-empty-static-block',
    'no-new-native-nonconstructor',
    'no-unused-private-class-members',
];

const config = await eslint.calculateConfigForFile('src/lint-probe.jsx');
for (const ruleName of legacyReactRules) {
    assert.equal(
        config.rules[`react/${ruleName}`]?.[0],
        2,
        `react/${ruleName} must remain an error.`
    );
}
for (const ruleName of legacyCoreErrorRules) {
    assert.equal(config.rules[ruleName]?.[0], 2, `${ruleName} must remain an error.`);
}
for (const ruleName of eslint9OnlyRecommendedRules) {
    assert.equal(config.rules[ruleName]?.[0], 0, `${ruleName} must stay disabled.`);
}

async function lintRuleIds(source, filePath) {
    const [result] = await eslint.lintText(source, { filePath });
    return new Set(result.messages.map(message => message.ruleId).filter(Boolean));
}

async function expectRule(source, filePath, ruleId) {
    const ruleIds = await lintRuleIds(source, filePath);
    assert.ok(
        ruleIds.has(ruleId),
        `Expected ${ruleId} to lint ${filePath}; got ${[...ruleIds].join(', ') || 'no rule messages'}.`
    );
}

async function expectRuleNotReported(source, filePath, ruleId) {
    const ruleIds = await lintRuleIds(source, filePath);
    assert.ok(
        !ruleIds.has(ruleId),
        `Did not expect ${ruleId} to lint ${filePath}; got ${[...ruleIds].join(', ')}.`
    );
}

await expectRule('var value = 1; console.log(value);', 'src/lint-probe.js', 'no-var');
await expectRule(
    "import { useState } from 'react'; function Component({ enabled }) { if (enabled) { useState(0); } return null; } export default Component;",
    'src/lint-probe.jsx',
    'react-hooks/rules-of-hooks'
);
await expectRule(
    'const Component = ({ items }) => <ul>{items.map((item) => <li>{item}</li>)}</ul>; export default Component;',
    'src/lint-probe.jsx',
    'react/jsx-key'
);
await expectRule(
    "const Component = () => <div clasName='typo' />; export default Component;",
    'src/lint-probe.jsx',
    'react/no-unknown-property'
);
await expectRule(
    "const Component = () => <div id='first' id='second' />; export default Component;",
    'src/lint-probe.jsx',
    'react/jsx-no-duplicate-props'
);
await expectRule(
    "const Component = () => <a href='https://example.test' target='_blank'>link</a>; export default Component;",
    'src/lint-probe.jsx',
    'react/jsx-no-target-blank'
);
await expectRule(
    "import React from 'react'; class Component extends React.Component { render() { return <div ref='legacy' />; } } export default Component;",
    'src/lint-probe.jsx',
    'react/no-string-refs'
);
await expectRule(
    "import React from 'react'; class Component extends React.Component { run() { return this.isMounted(); } render() { return null; } } export default Component;",
    'src/lint-probe.jsx',
    'react/no-is-mounted'
);
await expectRule(
    "import React from 'react'; class Component extends React.Component { render() {} } export default Component;",
    'src/lint-probe.jsx',
    'react/require-render-return'
);
await expectRule(
    'const Component = () => <MissingComponent />; export default Component;',
    'src/lint-probe.jsx',
    'react/jsx-no-undef'
);
await expectRule('const value = 1;;', 'src/lint-probe.js', 'no-extra-semi');
await expectRule(
    'if (condition) { function nested() {} }',
    'src/lint-probe.js',
    'no-inner-declarations'
);
await expectRule(' \tconst value = 1;', 'src/lint-probe.js', 'no-mixed-spaces-and-tabs');
await expectRule('new Symbol();', 'src/lint-probe.js', 'no-new-symbol');
await expectRuleNotReported('const _ignored = 1;', 'src/lint-probe.js', 'no-unused-vars');
await expectRuleNotReported(
    "try { throw new Error('expected'); } catch {}",
    'src/lint-probe.js',
    'no-empty'
);
await expectRuleNotReported(
    'const UsedOnlyInJsx = () => null; const Component = () => <UsedOnlyInJsx />; export default Component;',
    'src/lint-probe.jsx',
    'no-unused-vars'
);

for (const ignoredPath of [
    'dist/lint-probe.js',
    '.vite/lint-probe.js',
    'build/lint-probe.js',
    'modules/example/node_modules/lint-probe.js',
    'src/lint-probe.min.js',
    'src/lint-probe.bundle.js',
]) {
    assert.equal(
        await eslint.isPathIgnored(ignoredPath),
        true,
        `${ignoredPath} must remain ignored.`
    );
}

assert.equal(
    await eslint.isPathIgnored('src/lint-probe.jsx'),
    false,
    'Source files must remain linted.'
);
