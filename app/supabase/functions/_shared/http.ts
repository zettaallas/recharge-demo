// Small helpers shared by the Edge Functions: CORS (the web build calls these from the browser) and JSON replies.

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Normalise a class code the same way the app does: "8bk4p" and "8B K4P" both become "8B-K4P". */
export function normaliseCode(code: string): string {
  const c = String(code ?? '').toUpperCase().replace(/[\s-]/g, '');
  return c.length === 5 ? c.slice(0, 2) + '-' + c.slice(2) : c;
}
