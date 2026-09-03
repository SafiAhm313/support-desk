import { TicketPriority } from '../common/enums';
import { computeDueAt } from './due-date.util';

describe('computeDueAt', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');

  it('urgent priority is due in 4 hours', () => {
    const result = computeDueAt(TicketPriority.URGENT, from);
    expect(result.toISOString()).toBe('2026-01-01T04:00:00.000Z');
  });

  it('high priority is due in 24 hours', () => {
    const result = computeDueAt(TicketPriority.HIGH, from);
    expect(result.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('normal priority is due in 72 hours', () => {
    const result = computeDueAt(TicketPriority.NORMAL, from);
    expect(result.toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  it('low priority is due in 168 hours (7 days)', () => {
    const result = computeDueAt(TicketPriority.LOW, from);
    expect(result.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('defaults to the current time when no "from" is given', () => {
    const before = Date.now();
    const result = computeDueAt(TicketPriority.URGENT);
    const after = Date.now();
    const resultMs = result.getTime() - 4 * 60 * 60 * 1000;
    expect(resultMs).toBeGreaterThanOrEqual(before);
    expect(resultMs).toBeLessThanOrEqual(after);
  });
});