import { UserRole } from '../common/enums';
import { canUserAccessTicket } from './ticket-visibility.util';

describe('canUserAccessTicket', () => {
  const customer = { id: 1, role: UserRole.CUSTOMER };
  const otherCustomer = { id: 2, role: UserRole.CUSTOMER };
  const agent = { id: 3, role: UserRole.AGENT };
  const admin = { id: 4, role: UserRole.ADMIN };

  const ticketOwnedByCustomer = { requester: { id: 1 } };

  it('allows a customer to access their own ticket', () => {
    expect(canUserAccessTicket(customer, ticketOwnedByCustomer)).toBe(true);
  });

  it("denies a customer access to another customer's ticket", () => {
    expect(canUserAccessTicket(otherCustomer, ticketOwnedByCustomer)).toBe(
      false,
    );
  });

  it('allows an agent to access any ticket', () => {
    expect(canUserAccessTicket(agent, ticketOwnedByCustomer)).toBe(true);
  });

  it('allows an admin to access any ticket', () => {
    expect(canUserAccessTicket(admin, ticketOwnedByCustomer)).toBe(true);
  });
});