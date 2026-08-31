import type { Role } from '../../generated/prisma/enums';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
