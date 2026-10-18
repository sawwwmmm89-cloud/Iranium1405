import 'server-only';

type Level = 'info' | 'warn' | 'error';

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  const entry = { level, time: new Date().toISOString(), message, ...context };
  const line = JSON.stringify(entry, (_k, v: unknown) =>
    v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v,
  );
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export const logger = {
  info: (m: string, c?: Record<string, unknown>) => write('info', m, c),
  warn: (m: string, c?: Record<string, unknown>) => write('warn', m, c),
  error: (m: string, c?: Record<string, unknown>) => write('error', m, c),
};
