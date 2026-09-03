import { UserRole } from '../common/enums';

interface VisibilityUser {
  id: number;
  role: UserRole;
}

interface VisibilityTicket {
  requester: { id: number };
}

export function canUserAccessTicket(
  user: VisibilityUser,
  ticket: VisibilityTicket,
): boolean {
  if (user.role === UserRole.CUSTOMER) {
    return ticket.requester.id === user.id;
  }
  return true;
}