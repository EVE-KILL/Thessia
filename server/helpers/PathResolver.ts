import { fileURLToPath } from 'node:url';
import path from 'node:path';
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

  console.log(`Registering path alias '~' to ${projectRoot}`);

  // Register the module alias
  moduleAlias.addAliases({
    '~': projectRoot
  });

  // For ESM support, we need to patch the module resolution
  // This is a workaround for ESM limitations with module-alias
  const originalResolveFilename = (moduleAlias as any)._moduleResolver;
  if (originalResolveFilename) {
    (moduleAlias as any)._moduleResolver = function(request: string, parent: any) {
      console.debug(`Resolving path: ${request}`);
      try {
        return originalResolveFilename(request, parent);
      } catch (error) {
        // If resolution fails and it's an aliased path, try a direct path resolution
        if (request.startsWith('~/')) {
          const directPath = path.join(projectRoot, request.substring(2));
          console.debug(`Trying direct path resolution: ${directPath}`);
          return directPath;
        }
        throw error;
      }
    };
  }

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
 * For direct importing in ESM context, a helper that uses dynamic import
 * with resolved paths
 * @param modulePath Path with potential alias
 * @returns The module default export
 */
export async function importWithAlias(modulePath: string) {
  if (modulePath.startsWith('~/')) {
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    const projectRoot = path.resolve(path.dirname(currentFilePath), '../../');
    const resolvedPath = path.join(projectRoot, modulePath.substring(2));
    return await import(resolvedPath);
  }
  return await import(modulePath);
}
