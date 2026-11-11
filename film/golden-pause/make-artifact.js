// Builds preview/artifact.html (no document wrapper, sets no-js itself) and preview/artifact-player.js (.m4a is not an
// artifact-served type, so the AAC audio is published as golden-pause-aac.mp4). Run from this folder: node make-artifact.js
const fs = require('fs');
const src = fs.readFileSync('preview/index.html', 'utf8');
const head = src.slice(src.indexOf('<head>') + 6, src.indexOf('</head>'));
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
let rest = head.replace(title, '')
  .replace(/<meta charset[^>]*>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<meta name="color-scheme"[^>]*>\s*/, '');
rest = rest.replace("h.className += ' gp-wait';", "h.lang = 'en-AU'; h.className += ' no-js gp-wait';");
if (!rest.includes("' no-js gp-wait'")) throw new Error('inline script not patched');
const out = `${title}\n${rest.trim()}\n${body.trim()}\n`;
fs.writeFileSync('preview/artifact.html', out);
fs.writeFileSync('preview/artifact-player.js', fs.readFileSync('preview/player.js','utf8').replace("'golden-pause.m4a'", "'golden-pause-aac.mp4'"));
console.log('artifact.html', out.length, 'bytes; starts with', out.slice(0, 40));
