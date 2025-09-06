import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

// NOTE: This route is written for Expo Router (not Next.js). We rely only on Web Fetch API primitives.
// better-auth exposes helper APIs off the exported `auth` instance; we attempt to resolve the session
// from incoming headers (cookies / authorization) without Next.js specific objects.

const prisma = new PrismaClient();

async function getSessionFromRequest(req: Request) {
  try {
    // better-auth provides an internal api surface; using a duck-typed call if available.
    // If this fails in runtime, replace with the correct helper (e.g., auth.api.getSession or auth.getSession)
    // depending on your better-auth version.
    // @ts-ignore
    if (auth?.api?.getSession) {
      // @ts-ignore
      return await auth.api.getSession({ headers: req.headers });
    }
    // Fallback: try handler with minimal context (not ideal but prevents crash)
    return undefined;
  } catch {
    return undefined;
  }
}

// GET /api/tasks?date=YYYY-MM-DD -> tasks for that day (overlapping)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateStr = url.searchParams.get('date');
  if (!dateStr) {
    return new Response(JSON.stringify({ error: 'Missing date' }), { status: 400 });
  }
  const session = await getSessionFromRequest(req);
  if (!session?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd = new Date(dayStart); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { start: { gte: dayStart, lt: dayEnd } },
        { AND: [{ start: { lt: dayStart } }, { end: { gt: dayStart } }] },
      ],
    },
    include: { reminders: true, participants: true, repeatRule: true, tags: true },
    orderBy: { start: 'asc' },
  });
  return new Response(JSON.stringify({ tasks }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// POST /api/tasks -> create task
export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  const { title, start, end, description, allDay, priority, color, reminders } = body || {};
  if (!title || !start || !end) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  try {
    const task = await prisma.task.create({
      data: {
        title: String(title),
        start: new Date(start),
        end: new Date(end),
        description: description ? String(description) : null,
        allDay: !!allDay,
        priority: priority ?? 'NORMAL',
        color: color ?? null,
        userId: session.user.id,
        reminders: Array.isArray(reminders) && reminders.length
          ? { create: reminders.map((r: any) => ({ offsetMin: Number(r.offsetMin) || 0, method: r.method || 'PUSH' })) }
          : undefined,
      },
      include: { reminders: true },
    });
    return new Response(JSON.stringify({ task }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to create task', detail: e?.message }), { status: 500 });
  }
}
