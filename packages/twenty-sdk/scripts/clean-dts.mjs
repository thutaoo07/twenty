// Cross-platform cleanup of stray .d.ts artifacts before the SDK rollup step.
// Uses rimraf's JS API so glob patterns work identically on Windows and Unix
// (shell-quoted globs are passed literally by cmd.exe and break on Windows).
import { rimraf } from 'rimraf';

const patterns = [
  'dist/sdk',
  'dist/define/**/*.d.ts',
  'dist/define/**/*.d.ts.map',
  'dist/billing/**/*.d.ts',
  'dist/billing/**/*.d.ts.map',
  'dist/front-component/**/*.d.ts',
  'dist/front-component/**/*.d.ts.map',
  'dist/logic-function/**/*.d.ts',
  'dist/logic-function/**/*.d.ts.map',
  'dist/utils/**/*.d.ts',
  'dist/utils/**/*.d.ts.map',
];

await rimraf(patterns, { glob: true });
