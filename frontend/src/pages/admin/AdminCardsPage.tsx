import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cardsApi, concessoesApi, usersApi, downloadBlob } from '../../services/api';
import { Card, Concessao } from '../../types';
import { useBrandStore } from '../../store/brandStore';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CardStatusBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function AdminCardsPage() {
  const qc = useQueryClient();
  const { brand } = useBrandStore();
  const [filters, setFilters] = useState({ userId: '', concessaoId: '', status: '', search: '' });
  const [approveCard, setApproveCard] = useState<Card | null>(null);
  const [rejectCard, setRejectCard] = useState<Card | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['admin-cards', brand.slug, filters],
    queryFn: () => cardsApi.list({
      brand: brand.slug,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }).then(r => r.data as Card[]),
  });

  const { data: concessoes = [] } = useQuery({
    queryKey: ['concessoes', brand.slug],
    queryFn: () => concessoesApi.list(brand.slug).then(r => r.data as Concessao[]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', brand.slug],
    queryFn: () => usersApi.list({ brand: brand.slug }).then(r => r.data),
  });

  const approve = useMutation({
    mutationFn: () => cardsApi.validate(approveCard!.id, { status: 'ACTIVE' }),
    onSuccess: () => {
      toast.success('Cartão aprovado');
      setApproveCard(null);
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: () => toast.error('Erro ao aprovar cartão'),
  });

  const reject = useMutation({
    mutationFn: () => cardsApi.validate(rejectCard!.id, { status: 'REJECTED', rejectionReason }),
    onSuccess: () => {
      toast.success('Cartão rejeitado');
      setRejectCard(null);
      setRejectionReason('');
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: () => toast.error('Erro ao rejeitar cartão'),
  });

  async function handleExport() {
    try {
      const res = await cardsApi.exportExcel({
        view: 'admin', brand: brand.slug,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      downloadBlob(res.data, 'cartoes.xlsx');
    } catch {
      toast.error('Erro ao exportar');
    }
  }

  const fmt = (d?: string) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '—';

  return (
    <div>
      <PageHeader
        title="Cartões"
        subtitle={`${cards.length} cartão(ões)`}
        actions={
          <button className="btn-secondary btn btn-sm" onClick={handleExport}>
            Exportar Excel
          </button>
        }
      />

      <FilterBar onReset={() => setFilters({ userId: '', concessaoId: '', status: '', search: '' })}>
        <FilterField label="Pesquisa">
          <input className="input" placeholder="Pesquisar..." value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </FilterField>
        <FilterField label="Utilizador">
          <select className="input" value={filters.userId}
            onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}>
            <option value="">Todos</option>
            {(users as { id: string; name: string }[]).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Concessão">
          <select className="input" value={filters.concessaoId}
            onChange={e => setFilters(f => ({ ...f, concessaoId: e.target.value }))}>
            <option value="">Todas</option>
            {concessoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Estado">
          <select className="input" value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="REJECTED">Rejeitado</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : cards.length === 0 ? (
          <EmptyState message="Nenhum cartão encontrado." />
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Utilizador</th>
                  <th>Email</th>
                  <th>Concessão</th>
                  <th>Nº Cartão</th>
                  <th>Estado</th>
                  <th>Declaração</th>
                  <th>Data Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id}>
                    <td className="font-medium">{card.user.name}</td>
                    <td className="text-gray-500 text-xs">{card.user.email}</td>
                    <td>{card.concessao.name}</td>
                    <td className="font-mono text-sm">{card.cardNumber}</td>
                    <td><CardStatusBadge status={card.status} /></td>
                    <td>
                      {card.declarationUrl ? (
                        <a
                          href={`/${card.declarationUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:underline text-xs"
                        >
                          Ver documento
                        </a>
                      ) : '—'}
                    </td>
                    <td>{fmt(card.createdAt)}</td>
                    <td>
                      {card.status === 'PENDING' && (
                        <div className="flex gap-1.5">
                          <button
                            className="btn-success btn btn-sm"
                            onClick={() => setApproveCard(card)}
                          >
                            Aprovar
                          </button>
                          <button
                            className="btn-danger btn btn-sm"
                            onClick={() => { setRejectCard(card); setRejectionReason(''); }}
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{cards.length}</span> cartão(ões)
          </div>
          </>
        )}
      </div>

      {/* Approve confirmation modal */}
      <ConfirmModal
        isOpen={!!approveCard}
        onClose={() => setApproveCard(null)}
        onConfirm={() => approve.mutate()}
        title="Aprovar Cartão"
        message={`Confirma a aprovação do cartão ${approveCard?.cardNumber} de ${approveCard?.user.name}?`}
        confirmLabel="Aprovar"
        confirmVariant="success"
        isLoading={approve.isPending}
      />

      {/* Reject modal with comment */}
      <Modal isOpen={!!rejectCard} onClose={() => setRejectCard(null)} title="Rejeitar Cartão">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p><span className="text-gray-500">Utilizador: </span><strong>{rejectCard?.user.name}</strong></p>
            <p><span className="text-gray-500">Email: </span><span className="text-gray-600">{rejectCard?.user.email}</span></p>
            <p><span className="text-gray-500">Cartão: </span><strong className="font-mono">{rejectCard?.cardNumber}</strong></p>
          </div>
          <div>
            <label className="label">Motivo de rejeição *</label>
            <textarea
              className="input"
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Este motivo será enviado por email ao utilizador..."
            />
            <p className="text-xs text-gray-400 mt-1">O utilizador receberá um email com este comentário.</p>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost btn" onClick={() => setRejectCard(null)}>Cancelar</button>
            <button
              className="btn-danger btn"
              onClick={() => reject.mutate()}
              disabled={reject.isPending || !rejectionReason.trim()}
            >
              {reject.isPending ? 'A rejeitar...' : 'Rejeitar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
