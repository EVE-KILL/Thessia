/**
 * This file should be imported at the very beginning of any script
 * that needs to use path aliases outside the Nuxt context
 */
import { registerPathAliases } from './helpers/PathResolver';

// Register aliases as early as possible
registerPathAliases();

console.log('Path aliases registered');
