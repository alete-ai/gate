// Common Node.js shims for browser-side bundling
export const parseHTML = () => ({ document: null });
export const createHash = () => ({ update: () => ({ digest: () => '' }) });
export const Worker = class {};
export const cpus = () => [];
export const Readable = class {};

// Path shims
export const join = (...args: string[]) => args.join('/');
export const resolve = (...args: string[]) => args.join('/');
export const dirname = (p: string) => p.split('/').slice(0, -1).join('/') || '.';
export const basename = (p: string) => p.split('/').pop() || '';
export const extname = (p: string) => {
  const parts = p.split('.');
  return parts.length > 1 ? '.' + parts.pop() : '';
};

// FS shims
export const readFileSync = () => '';
export const existsSync = () => false;
export const promises = {
  readFile: async () => '',
  writeFile: async () => {},
};

export default {
  join, resolve, dirname, basename, extname,
  readFileSync, existsSync,
  promises,
  createHash,
  Worker,
  cpus,
  Readable
};
