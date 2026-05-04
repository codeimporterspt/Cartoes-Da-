import { CardStatus, PrizeStatus, ImportStatus } from '../../types';

const cardStatusMap: Record<CardStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'badge-yellow' },
  ACTIVE: { label: 'Ativo', className: 'badge-green' },
  INACTIVE: { label: 'Inativo', className: 'badge-gray' },
  REJECTED: { label: 'Rejeitado', className: 'badge-red' },
};

const prizeStatusMap: Record<PrizeStatus, { label: string; className: string }> = {
  PENDENTE:  { label: 'Pendente de Validação', className: 'badge-yellow' },
  VALIDADO:  { label: 'Validado',              className: 'badge-green'  },
  CARREGADO: { label: 'Carregado',             className: 'badge-blue'   },
  REJEITADO: { label: 'Rejeitado',             className: 'badge-red'    },
};

const importStatusMap: Record<ImportStatus, { label: string; className: string }> = {
  PROCESSING: { label: 'A processar', className: 'badge-yellow' },
  SUCCESS: { label: 'Sucesso', className: 'badge-green' },
  ERROR: { label: 'Erro', className: 'badge-red' },
};

export function CardStatusBadge({ status }: { status: CardStatus }) {
  const { label, className } = cardStatusMap[status];
  return <span className={className}>{label}</span>;
}

export function PrizeStatusBadge({ status }: { status: PrizeStatus }) {
  const entry = prizeStatusMap[status] ?? { label: status, className: 'badge-gray' };
  return <span className={entry.className}>{entry.label}</span>;
}

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const { label, className } = importStatusMap[status];
  return <span className={className}>{label}</span>;
}
