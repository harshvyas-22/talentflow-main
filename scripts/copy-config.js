import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define root directory
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist!');
  process.exit(1);
}

// Copy config files from public
const publicFiles = ['_redirects', 'web.config'];
for (const file of publicFiles) {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} from public to dist`);
  } else {
    console.warn(`Warning: ${file} not found in public directory`);
  }
}

// Copy root config files
const rootConfigFiles = ['render.json', 'vercel.json', 'netlify.toml', 'static.json'];
for (const file of rootConfigFiles) {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} from root to dist`);
  } else {
    console.warn(`Warning: ${file} not found in root directory`);
  }
}

console.log('Post-build file copying completed successfully!');