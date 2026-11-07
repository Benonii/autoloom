import { ConvexError } from 'convex/values';

import { serverInstructions, tools } from '@/mcp/tools';

interface RPCRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const protocolVersion = '2025-06-18';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version'
};

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function readAgentKey(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  const bearerKey = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearerKey ?? new URL(request.url).searchParams.get('key');
}

function readMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') return error.data;
  if (error instanceof Error)
    return error.message.match(/Uncaught (?:Convex)?Error: (.+?)(\n| at |$)/)?.[1] ?? error.message;
  return 'Something went wrong';
}

async function callTool(request: Request, params: Record<string, unknown>) {
  const tool = tools.find((candidate) => candidate.name === params.name);
  if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool ${String(params.name)}` }] };
  const agentKey = readAgentKey(request);
  if (!agentKey) {
    const text =
      'Autoloom is not connected yet. Ask the user to make a key at https://autoloom-app.vercel.app/connect.';
    return { isError: true, content: [{ type: 'text', text }] };
  }
  try {
    const input = (params.arguments ?? {}) as Record<string, unknown>;
    const result = await tool.run(input, { agentKey, origin: new URL(request.url).origin });
    return { content: [{ type: 'text', text: result.text }], structuredContent: result.data };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: readMessage(error) }] };
  }
}

async function handle(request: Request, message: RPCRequest): Promise<unknown | null> {
  if (message.id === undefined || message.id === null) return null;
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: message.id, result });
  if (message.method === 'initialize') {
    return reply({
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'autoloom', title: 'Autoloom', version: '0.1.0' },
      instructions: serverInstructions
    });
  }
  if (message.method === 'ping') return reply({});
  if (message.method === 'tools/list') {
    return reply({
      tools: tools.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema }))
    });
  }
  if (message.method === 'tools/call') return reply(await callTool(request, message.params ?? {}));
  return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unknown method ${message.method}` } };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }, 400);
  }
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map((message) => handle(request, message as RPCRequest)))).filter(Boolean);
    return replies.length > 0 ? respond(replies) : new Response(null, { status: 202, headers: corsHeaders });
  }
  const reply = await handle(request, body as RPCRequest);
  return reply ? respond(reply) : new Response(null, { status: 202, headers: corsHeaders });
}

export function GET(): Response {
  return new Response('Autoloom MCP server. Connect with Streamable HTTP at this address.', {
    status: 405,
    headers: { Allow: 'POST', ...corsHeaders }
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}
