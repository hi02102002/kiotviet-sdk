import type { Express } from 'express';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';

/** Start an Express app on an ephemeral port and return its base URL. */
export async function listen(app: Express): Promise<{ server: http.Server; url: string }> {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

export async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close(error =>
      error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve(),
    ),
  );
}
