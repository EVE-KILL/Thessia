import { build } from 'esbuild';
import { resolve } from 'path';
import fs from 'fs';
import { glob } from 'glob';

// Utility function to generate the queue loader file
export function generateQueueLoader(targetFile = 'src/queue/.loader.ts') {
  // Find all queue files
  const queueFiles = glob.sync('src/queue/**/*.{ts,js}', {
    ignore: ['**/.*', '**/.*.*', '**/.loader.ts', '**/.loader.js', '**/_*.ts', '**/_*.js']
  });

  // Generate import statements and queue job entries
  let importStatements: string[] = [];
  let queueEntries: string[] = [];

  for (const file of queueFiles) {
    // Extract the base filename without extension
    const baseName = file.replace(/^src\/queue\//, '').replace(/\.(ts|js)$/, '');

    // Generate a valid variable name from the file name (handle paths with slashes)
    const varName = baseName.replace(/[-\/\\](.)/g, (_, c) => c.toUpperCase());

    // Calculate relative path for import
    const relativePath = `./${baseName}`;

    // Add the import statement
    importStatements.push(`import ${varName} from '${relativePath}';`);

    // Add the queue job entry
    queueEntries.push(`  ${varName},`);
  }

  // Create the loader file content
  const loaderContent = `// Auto-generated queue jobs loader
${importStatements.join('\n')}

// Export all queue job modules
export const queueJobs = {
${queueEntries.join('\n')}
};
`;

  // Write the loader file
  fs.writeFileSync(resolve(targetFile), loaderContent);

  return queueFiles.length;
}

async function buildQueue() {
  console.log('Building Queue...');

  const outdir = resolve('.output/queue');
  const projectRoot = resolve('.');

  // Ensure output directory exists
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  // Generate the queue loader file in src/queue
  generateQueueLoader();

  // List of modules that should remain external (only Node.js built-ins)
  const externalModules = ['fs', 'path', 'os', 'child_process', 'crypto', 'events', 'stream', 'bun:sqlite'];

  try {
    // Build the single queue binary
    console.log('Building single Queue binary...');
    await build({
      entryPoints: ['queue.ts'],
      bundle: true,
      platform: 'node',
      target: 'esnext',
      outfile: resolve(outdir, 'queue.js'),
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

    // Make Queue executable
    fs.chmodSync(resolve(outdir, 'queue.js'), '755');

    // Create package.json in the output directory with all required dependencies
    const packageJson = {
      "name": "thessia-queue",
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

    console.log('Queue build completed successfully');
    console.log('Run with: bun --bun run .output/queue/queue.js <command>');
  } catch (error) {
    console.error('Queue build failed:', error);
    process.exit(1);
  }
}

// If this file is being run directly, build the queue
if (require.main === module) {
  buildQueue();
}
