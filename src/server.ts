import http from 'node:http';

const port = Number(process.env.PORT) || 3000;

export function startHttpServer(): void {
  const server = http.createServer((req, res) => {
    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      (req.url === '/' || req.url === '/health')
    ) {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
      });

      res.end('OK');
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    console.log(`🌐 HTTP Server listening on port ${port}`);
  });
}