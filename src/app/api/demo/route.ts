import acmeTasksPage from '@/demo/acmeTasks.html?raw';

export function GET() {
  return new Response(acmeTasksPage, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
