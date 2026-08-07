import path from 'path';

// If the code is built through the testing module, assets are not output to the dist/assets directory.
// Split on both separators so the check works on Windows (backslash) as well as POSIX (forward slash).
const IS_BUILT_THROUGH_TESTING_MODULE = !__dirname
  .split(/[\\/]/)
  .includes('dist');

export const ASSET_PATH = IS_BUILT_THROUGH_TESTING_MODULE
  ? path.resolve(__dirname, `../`)
  : path.resolve(__dirname, `../assets`);
