/**
 * Internal bridge converting between Node-style (Express/NestJS) request and
 * response objects and the web-standard `Request`/`Response` used by the
 * `kiotviet()` handler. Structural on purpose: works with Express 4/5 and
 * NestJS (Express platform) without importing framework types.
 */

export interface NodeBridgeRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, unknown>;
  body?: unknown;
  rawBody?: Buffer;
}

export interface NodeBridgeResponse {
  status: (code: number) => unknown;
  setHeader: (name: string, value: string) => unknown;
  end: (chunk?: Buffer | string) => unknown;
}

/**
 * Convert a Node/Express request into a web-standard `Request`.
 * Prefers a captured raw body (`req.rawBody`) so webhook signatures verify
 * against the exact bytes; falls back to the parsed body.
 */
export function nodeToWebRequest(req: NodeBridgeRequest): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }

  const url = `http://${req.headers.host ?? 'localhost'}${req.originalUrl ?? req.url ?? '/'}`;

  let body: BodyInit | undefined;
  if (req.rawBody) {
    body = req.rawBody as unknown as BodyInit;
  }
  else if (typeof req.body === 'string') {
    body = req.body;
  }
  else if (req.body != null) {
    body = JSON.stringify(req.body);
  }

  return new Request(url, { method: req.method, headers, body: body ?? undefined });
}

/** Write a web-standard `Response` back into a Node/Express response. */
export async function webResponseToNode(response: Response, res: NodeBridgeResponse): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    // Let the platform set transfer framing itself
    if (key !== 'transfer-encoding' && key !== 'content-length') {
      res.setHeader(key, value);
    }
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
