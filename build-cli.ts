import { build } from 'esbuild';
import { resolve } from 'path';
import fs from 'fs';
import { glob } from 'glob';

// Utility function to generate the CLI loader file
export function generateCliLoader(targetFile = 'src/console/.loader.ts') {
  // Find all command files
  const commandFiles = glob.sync('src/console/**/*.{ts,js}', {
    ignore: ['**/.*', '**/.*.*', '**/.loader.ts', '**/.loader.js', '**/_*.ts', '**/_*.js']
  });

  // Generate import statements and commands object
  let importStatements: string[] = [];
  let commandEntries: string[] = [];

  for (const file of commandFiles) {
    // Extract the base filename without extension
    const baseName = file.replace(/^src\/console\//, '').replace(/\.(ts|js)$/, '');

    // Generate a valid variable name from the file name (handle paths with slashes)
    const varName = baseName.replace(/[-\/\\](.)/g, (_, c) => c.toUpperCase());

    // Calculate relative path for import
    const relativePath = `./${baseName}`;

    // Add the import statement
    importStatements.push(`import ${varName} from '${relativePath}';`);

    // Add the command entry
    commandEntries.push(`  ${varName},`);
  }

  // Create the loader file content
  const loaderContent = `// Auto-generated CLI commands loader
${importStatements.join('\n')}

// Export all command modules
export const commands = {
${commandEntries.join('\n')}
};
`;

  // Write the loader file
  fs.writeFileSync(resolve(targetFile), loaderContent);

  return commandFiles.length;
}

async function buildCLI() {
  console.log('Building CLI...');

  const outdir = resolve('.output/cli');
  const projectRoot = resolve('.');

  // Ensure output directory exists
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  // Generate the command loader file in src/console
  generateCliLoader();

  // List of modules that should remain external (only Node.js built-ins)
  const externalModules = ['fs', 'path', 'os', 'child_process', 'crypto', 'events', 'stream', 'bun:sqlite'];

  try {
    // Build the single console binary
    console.log('Building single CLI binary...');
    await build({
      entryPoints: ['console.ts'],
      bundle: true,
      platform: 'node',
      target: 'esnext',
      outfile: resolve(outdir, 'console.js'),
      format: 'esm',
      sourcemap: true,
      external: externalModules,
      alias: {
        '~': projectRoot,
      },
      minify: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
    });

    // Make CLI executable
    fs.chmodSync(resolve(outdir, 'console.js'), '755');

    // Create package.json in the output directory with required dependencies
    const packageJson = {
      "name": "thessia-cli",
      "private": true,
      "type": "module",
      "dependencies": {
        "mongoose": "*",
        "commander": "*",
        "ioredis": "*",
        "bullmq": "*",
        "glob": "*",
        "stream-json": "*",
        "lru-cache": "*"
      }
    };

    fs.writeFileSync(
      resolve(outdir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    console.log('CLI build completed successfully');
    console.log('Run with: bun --bun run .output/cli/console.js <command>');
  } catch (error) {
    console.error('CLI build failed:', error);
    process.exit(1);
  }
}

// If this file is being run directly, build the CLI
if (require.main === module) {
  buildCLI();
}
