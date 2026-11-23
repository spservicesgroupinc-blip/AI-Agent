import { handleConfigRequest } from '../src/server/chatProxy.ts';

export function GET(): Response {
  const result = handleConfigRequest(process.env);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Relay-Proxy': '1',
      'Cache-Control': 'no-store',
    },
  });
}
