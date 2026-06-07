import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    // .claude/ geymir m.a. teymis-worktrees (.claude/worktrees/*) sem hafa
    // sína eigin lint-keyrslu — aðal-keyrslan á ekki að skanna þau.
    ignores: ['dist/', 'node_modules/', '.netlify/', 'research/', '.claude/'],
  },
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Classic hooks rules only — the v7 "recommended" preset enables the React
      // Compiler analyses (purity, set-state-in-effect), which flag established
      // patterns in this codebase (Date.now() in handlers, reset-on-open effects)
      // without catching real bugs. Revisit if/when the compiler is adopted.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Pragmatic, bug-focused tweaks (see juneimpro.md 4.1): catch real bugs,
    // don't fight the codebase's existing idioms.
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
