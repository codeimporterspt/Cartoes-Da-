export type Role = 'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
export type CardStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
export type PrizeStatus = 'PENDENTE' | 'VALIDADO' | 'CARREGADO' | 'REJEITADO';
export type ImportStatus = 'PROCESSING' | 'SUCCESS' | 'ERROR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  brands: string[];
  pendingBrands: string[];
  concessaoIds: string[];
  concessoes: Concessao[];
  nif?: string;
  concessao?: Concessao;
  concessaoId?: string;
  createdAt: string;
  deactivatedAt?: string | null;
}

export interface Concessao {
  id: string;
  name: string;
  dealerCode: string;
  brand?: string;
}

export interface Card {
  id: string;
  userId: string;
  user: User;
  concessaoId: string;
  concessao: Concessao;
  cardNumber: string;
  seriesNumber: string;
  status: CardStatus;
  balance: number;
  declarationUrl?: string;
  rejectionReason?: string;
  validatedAt?: string;
  createdAt: string;
  balanceHistory?: CardBalanceHistory[];
  loadingHistory?: { loadedAt: string }[];
}

export interface CardBalanceHistory {
  id: string;
  cardId: string;
  balanceValue: number;
  movementValue: number;
  updatedBy: { name: string; role?: string };
  updatedAt: string;
  notes?: string;
}

export interface Prize {
  id: string;
  userId: string;
  user: User;
  concessaoId: string;
  concessao: Concessao;
  originId?: string;
  origin?: Origin;
  area?: string;
  value: number;
  period: string;
  status: PrizeStatus;
  importDate: string;
  validationDate?: string;
  paymentDate?: string;
  rejectionReason?: string;
}

export interface Origin {
  id: string;
  name: string;
  area: string;
  estado: string;
  matricula: string;
  modelo: string;
  description?: string;
  createdAt: string;
}

export interface CardLoadingHistory {
  id: string;
  cardId: string;
  card: { cardNumber: string };
  userId: string;
  user: User;
  origin?: Origin;
  movementValue: number;
  balanceValue: number;
  loadedAt: string;
  extranetLogin?: string;
}

export interface PrizeImport {
  id: string;
  importedBy: { name: string; email: string };
  fileUrl: string;
  importedAt: string;
  status: ImportStatus;
  errorDetails?: string;
  prizeCount: number;
  importType: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}
