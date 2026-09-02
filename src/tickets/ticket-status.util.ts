import { TicketStatus } from '../common/enums';

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [TicketStatus.IN_PROGRESS],
};

export function isValidTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresNoteToReopen(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return from === TicketStatus.CLOSED && to === TicketStatus.IN_PROGRESS;
}