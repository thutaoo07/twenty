// Cross-platform copy of the built twenty-client-sdk into the server's dist assets.
// Replaces `mkdir -p ... && cp -r ...`, which relies on Unix coreutils and fails
// under cmd.exe on Windows.
import { mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const dest = 'dist/assets/twenty-client-sdk';

mkdirSync(dest, { recursive: true });
cpSync('../twenty-client-sdk/package.json', join(dest, 'package.json'));
cpSync('../twenty-client-sdk/dist', join(dest, 'dist'), { recursive: true });
