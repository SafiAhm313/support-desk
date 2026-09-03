import { TicketStatus } from '../common/enums';
import { isValidTransition, requiresNoteToReopen } from './ticket-status.util';

describe('isValidTransition', () => {
  it('allows open -> in_progress', () => {
    expect(isValidTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
  });

  it('allows in_progress -> resolved', () => {
    expect(isValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
  });

  it('allows resolved -> closed', () => {
    expect(isValidTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
  });

  it('allows resolved -> in_progress (reopen)', () => {
    expect(isValidTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(true);
  });

  it('allows closed -> in_progress (reopen)', () => {
    expect(isValidTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(true);
  });

  it('rejects open -> resolved (skips a step)', () => {
    expect(isValidTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(false);
  });

  it('rejects open -> closed', () => {
    expect(isValidTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
  });

  it('rejects in_progress -> closed (skips a step)', () => {
    expect(isValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
  });

  it('rejects closed -> open', () => {
    expect(isValidTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
  });

  it('rejects closed -> resolved', () => {
    expect(isValidTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
  });

  it('rejects a status transitioning to itself', () => {
    expect(isValidTransition(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
  });
});

describe('requiresNoteToReopen', () => {
  it('requires a note when reopening from closed', () => {
    expect(requiresNoteToReopen(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(true);
  });

  it('does NOT require a note when reopening from resolved', () => {
    expect(requiresNoteToReopen(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
  });

  it('does not apply to unrelated transitions', () => {
    expect(requiresNoteToReopen(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(false);
  });
});