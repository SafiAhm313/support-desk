import { TicketPriority } from '../common/enums';

const HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  [TicketPriority.URGENT]: 4,
  [TicketPriority.HIGH]: 24,
  [TicketPriority.NORMAL]: 72,
  [TicketPriority.LOW]: 168,
};

export function computeDueAt(
  priority: TicketPriority,
  from: Date = new Date(),
): Date {
  const hours = HOURS_BY_PRIORITY[priority];
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}