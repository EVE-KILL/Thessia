import { fileURLToPath } from 'node:url';
import path from 'node:path';
// Import the package as a whole instead of trying to import a named export
import moduleAlias from 'module-alias';

/**
 * Registers the '~' path alias to point to the project root
 * This should be called at the start of CLI scripts before any imports that use path aliases
 */
export function registerPathAliases() {
  // Get the project root directory
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const projectRoot = path.resolve(path.dirname(currentFilePath), '../../');

  // Use addAliases method from the imported module
  moduleAlias.addAliases({
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
