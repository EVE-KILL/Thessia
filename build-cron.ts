import { build } from 'esbuild';
import { resolve } from 'path';
import fs from 'fs';
import { glob } from 'glob';

// Utility function to generate the cron loader file
export function generateCronLoader(targetFile = 'src/cron/.loader.ts') {
  // Find all cron files
  const cronFiles = glob.sync('src/cron/**/*.{ts,js}', {
    ignore: ['**/.*', '**/.*.*', '**/.loader.ts', '**/.loader.js', '**/_*.ts', '**/_*.js']
  });

  // Generate import statements and cron job entries
  let importStatements: string[] = [];
  let cronEntries: string[] = [];

  for (const file of cronFiles) {
    // Extract the base filename without extension
    const baseName = file.replace(/^src\/cron\//, '').replace(/\.(ts|js)$/, '');

    // Generate a valid variable name from the file name (handle paths with slashes)
    const varName = baseName.replace(/[-\/\\](.)/g, (_, c) => c.toUpperCase());

    // Calculate relative path for import
    const relativePath = `./${baseName}`;

    // Add the import statement
    importStatements.push(`import ${varName} from '${relativePath}';`);

    // Add the cron job entry
    cronEntries.push(`  ${varName},`);
  }

  // Create the loader file content
  const loaderContent = `// Auto-generated cron jobs loader
${importStatements.join('\n')}

// Export all cron job modules
export const cronJobs = [
${cronEntries.join('\n')}
];
`;

  // Write the loader file
  fs.writeFileSync(resolve(targetFile), loaderContent);

  return cronFiles.length;
}

async function buildCron() {
  console.log('Building Cron...');

  const outdir = resolve('.output/cron');
  const projectRoot = resolve('.');

  // Ensure output directory exists
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  // Generate the cron loader file in src/cron
  generateCronLoader();

  // List of modules that should remain external (only Node.js built-ins)
  const externalModules = ['fs', 'path', 'os', 'child_process', 'crypto', 'events', 'stream', 'bun:sqlite'];

  try {
    // Build the single cron binary
    console.log('Building single Cron binary...');
    await build({
      entryPoints: ['cron.ts'],
      bundle: true,
      platform: 'node',
      target: 'esnext',
      outfile: resolve(outdir, 'cron.js'),
      format: 'esm',
      sourcemap: true,
      external: externalModules,
      alias: {
        '~': projectRoot,
      },
      minify: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
    });

    // Make Cron executable
    fs.chmodSync(resolve(outdir, 'cron.js'), '755');

    // Create package.json in the output directory with required dependencies
    const packageJson = {
      "name": "thessia-cron",
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

    console.log('Cron build completed successfully');
    console.log('Run with: bun --bun run .output/cron/cron.js');
  } catch (error) {
    console.error('Cron build failed:', error);
    process.exit(1);
  }
}

// If this file is being run directly, build the cron
if (require.main === module) {
  buildCron();
}
