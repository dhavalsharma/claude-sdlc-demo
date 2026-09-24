import { describe, it, expect } from 'vitest';
import { getHealth } from './health.js';

describe('getHealth', () => {
  it('reports ok with a timestamp', () => {
    const h = getHealth(new Date('2026-01-01T00:00:00Z'));
    expect(h.status).toBe('ok');
    expect(h.time).toBe('2026-01-01T00:00:00.000Z');
  });
});
