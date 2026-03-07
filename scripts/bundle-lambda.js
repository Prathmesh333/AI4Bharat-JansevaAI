// Bundle Lambda handler with all dependencies
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outdir = path.join(__dirname, '..', 'dist-lambda');

// Clean output directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true, force: true });
}
fs.mkdirSync(outdir, { recursive: true });

// Bundle the Lambda handler
esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'lambda-handler.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: path.join(outdir, 'index.js'),
  external: [],
  sourcemap: true,
  minify: false,
  format: 'cjs',
}).then(() => {
  console.log('✅ Lambda handler bundled successfully');
  
  // Copy dataset folder
  const datasetSrc = path.join(__dirname, '..', 'dataset');
  const datasetDest = path.join(outdir, 'dataset');
  
  if (fs.existsSync(datasetSrc)) {
    fs.cpSync(datasetSrc, datasetDest, { recursive: true });
    console.log('✅ Copied dataset folder');
  }
  
  console.log(`\n📦 Lambda package ready in: ${outdir}`);
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
