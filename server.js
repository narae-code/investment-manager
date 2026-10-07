const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const requestedFile = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(root, requestedFile);

  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
}).listen(8000, '127.0.0.1', () => console.log('Dashboard available at http://127.0.0.1:8000'));
