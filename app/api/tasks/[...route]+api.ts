import { PrismaClient, type ReminderMethod, type TaskPriority, type User } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

interface SimpleSession { user: User; session: { id: string; token: string } }

async function getSessionFromRequest(req: Request): Promise<SimpleSession | undefined> {
  const headersObj: Record<string,string> = {};
  req.headers.forEach((v,k)=>{ headersObj[k]=v; });
  // eslint-disable-next-line no-console
  console.log('[tasks api] incoming headers', headersObj);

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let bearerToken: string | undefined;
  if (authHeader?.toLowerCase().startsWith('bearer ')) bearerToken = authHeader.slice(7).trim();

  // Direct lookup in Session table for bearer token (faster / explicit) if present
  if (bearerToken) {
    try {
      const sessionRow = await prisma.session.findUnique({ where: { token: bearerToken }, include: { user: true } });
      if (sessionRow && sessionRow.expiresAt > new Date()) {
  return { user: sessionRow.user, session: { id: sessionRow.id, token: sessionRow.token } };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[tasks api] direct token lookup error', e);
    }
  }

  // Fallback to better-auth helper (cookie based)
  try {
    // @ts-ignore attempt better-auth session accessor
    if (auth?.api?.getSession) {
      // @ts-ignore
      return await auth.api.getSession({ headers: req.headers });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[tasks api] cookie getSession error', e);
  }
  return undefined;
}

// GET /api/tasks?date=YYYY-MM-DD
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateStr = url.searchParams.get('date');
  if (!dateStr) return new Response(JSON.stringify({ error: 'Missing date' }), { status: 400 });
  const session = await getSessionFromRequest(req);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
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

interface CreateReminderInput { offsetMin: number; method?: ReminderMethod }
interface CreateTaskBody {
  title: string;
  start: string;
  end: string;
  description?: string;
  allDay?: boolean;
  priority?: TaskPriority;
  color?: string | null;
  reminders?: CreateReminderInput[];
}

// POST /api/tasks
export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }
  if (typeof body !== 'object' || body === null) return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
  const { title, start, end, description, allDay, priority, color, reminders } = body as CreateTaskBody;
  if (!title || !start || !end) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
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
        reminders: Array.isArray(reminders) && reminders.length ? { create: reminders.map((r) => ({ offsetMin: Number(r.offsetMin) || 0, method: r.method || 'PUSH' })) } : undefined,
      },
      include: { reminders: true },
    });
    return new Response(JSON.stringify({ task }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Failed to create task', detail: message }), { status: 500 });
  }
}
