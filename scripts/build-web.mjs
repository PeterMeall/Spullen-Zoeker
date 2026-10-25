// Kopieert de webbestanden naar ./www zodat Capacitor ze in de Android-app kan zetten.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const files = ['index.html', 'styles.css', 'app.js', 'firebase-config.js', 'manifest.json', 'icon.svg', 'sw.js'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const f of files) cpSync(f, `www/${f}`);
console.log('www/ is klaar');
