import { Request } from 'express';

export type Role = 'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
    brands?: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  brands?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface CardFilters {
  userId?: string;
  concessaoId?: string;
  status?: string;
  search?: string;
}

export interface PrizeFilters {
  userId?: string;
  concessaoId?: string;
  area?: string;
  originId?: string;
  year?: string;
  month?: string;
  status?: string;
  search?: string;
}
