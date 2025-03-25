import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { register } from 'module-alias';

/**
 * Registers the '~' path alias to point to the project root
 * This should be called at the start of CLI scripts before any imports that use path aliases
 */
export function registerPathAliases() {
  // Get the project root directory
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const projectRoot = path.resolve(path.dirname(currentFilePath), '../../');

  // Register the '~' alias to point to the project root
  register({
    '~': projectRoot
  });

  return projectRoot;
}

/**
 * Resolves a path with the '~' alias to an absolute path
 * @param pathWithAlias Path that may contain the '~' alias
 * @returns Resolved absolute path
 */
export function resolvePath(pathWithAlias: string): string {
  if (pathWithAlias.startsWith('~/')) {
    return path.join(process.cwd(), pathWithAlias.substring(2));
  }
  return pathWithAlias;
}

/**
 * Helper for importing modules with path alias support
 * @param modulePath Path that may contain the '~' alias
 * @returns The imported module
 */
export async function importWithPathResolution(modulePath: string) {
  const resolvedPath = resolvePath(modulePath);
  return await import(resolvedPath);
}
