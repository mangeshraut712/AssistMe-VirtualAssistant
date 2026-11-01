const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');

const legacyReactRuleNames = [
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

// Keep the exact React rules that were active in the legacy config. Loading
// them individually avoids eagerly loading disabled rules with an obsolete
// minimatch call signature while retaining the project's existing coverage.
const legacyReactPlugin = {
    rules: Object.fromEntries(
        legacyReactRuleNames.map(ruleName => [
            ruleName,
            require(`eslint-plugin-react/lib/rules/${ruleName}.js`),
        ])
    ),
};

module.exports = [
    {
        ignores: [
            'dist',
            'node_modules',
            '.vite',
            'build',
            'modules/*/node_modules',
            '**/*.min.js',
            '**/*.bundle.js',
        ],
    },
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                jsxPragma: null,
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            react: legacyReactPlugin,
            ...reactHooks.configs.flat.recommended.plugins,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...Object.fromEntries(
                legacyReactRuleNames.map(ruleName => [`react/${ruleName}`, 'error'])
            ),
            ...reactHooks.configs.flat.recommended.rules,
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    caughtErrors: 'none',
                },
            ],
            // Preserve the ESLint 8 baseline rather than adding unrelated source fixes.
            'no-useless-assignment': 'off',
            'no-constant-binary-expression': 'off',
            'no-empty-static-block': 'off',
            'no-new-native-nonconstructor': 'off',
            'no-unused-private-class-members': 'off',
            'no-extra-semi': 'error',
            'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
            'no-mixed-spaces-and-tabs': 'error',
            'no-new-symbol': 'error',
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-constant-condition': ['error', { checkLoops: false }],
            'react-hooks/exhaustive-deps': 'warn',
            complexity: 'off',
            'max-depth': 'off',
            'max-lines-per-function': 'off',
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'error',
            eqeqeq: ['warn', 'always', { null: 'ignore' }],
            curly: ['warn', 'multi-line'],
            'no-duplicate-imports': 'error',
        },
    },
];
