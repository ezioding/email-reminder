/**
 * Static file serving for web UI
 */

import indexHtml from '../public/index.html';
import stylesCss from '../public/styles.css';
import appJs from '../public/app.js';

const STATIC_FILES = {
  '/': { content: indexHtml, type: 'text/html; charset=utf-8' },
  '/index.html': { content: indexHtml, type: 'text/html; charset=utf-8' },
  '/styles.css': { content: stylesCss, type: 'text/css; charset=utf-8' },
  '/app.js': { content: appJs, type: 'application/javascript; charset=utf-8' },
};

export function serveStaticFile(path) {
  const file = STATIC_FILES[path];

  if (!file) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(file.content, {
    headers: {
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
