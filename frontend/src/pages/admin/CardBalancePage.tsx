import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cardsApi, concessoesApi, usersApi, downloadBlob } from '../../services/api';
import { fmtMoney } from '../../utils/format';
import { Card, Concessao } from '../../types';
import { useBrandStore } from '../../store/brandStore';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CardStatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function CardBalancePage() {
  const { brand } = useBrandStore();
  const [filters, setFilters] = useState({ userId: '', concessaoId: '', status: '', search: '' });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards-balance', brand.slug, filters],
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

  const fmt = (d?: string | null) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '—';

  async function handleExport() {
    try {
      const res = await cardsApi.exportExcel({
        brand: brand.slug,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      downloadBlob(res.data, 'saldo_cartoes.xlsx');
    } catch {
      toast.error('Erro ao exportar');
    }
  }

  return (
    <div>
      <PageHeader
        title="Saldo Cartão"
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
            <option value="ACTIVE">Ativo</option>
            <option value="PENDING">Pendente</option>
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
                  <th>NIF</th>
                  <th>Cód. Dealer</th>
                  <th>Concessão</th>
                  <th>Nº Cartão</th>
                  <th>Nº Série</th>
                  <th>Saldo Atual</th>
                  <th>Estado</th>
                  <th>Data Atualiz. Utilizador</th>
                  <th>Data Atualiz. Importador</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id}>
                    <td className="font-medium">{card.user.name}</td>
                    <td className="text-gray-500 text-xs">{card.user.email}</td>
                    <td className="text-gray-500">{card.user.nif || '—'}</td>
                    <td className="font-mono text-xs">{card.user.concessao?.dealerCode || '—'}</td>
                    <td>{card.concessao.name}</td>
                    <td className="font-mono text-sm">{card.cardNumber}</td>
                    <td className="text-sm">{card.seriesNumber}</td>
                    <td className="font-bold text-brand-primary">
                      {fmtMoney(Number(card.balance))} €
                    </td>
                    <td><CardStatusBadge status={card.status} /></td>
                    <td className="text-sm text-gray-500">
                      {fmt(card.balanceHistory?.find(h => h.updatedBy.role === 'USER')?.updatedAt)}
                    </td>
                    <td className="text-sm text-gray-500">
                      {(() => {
                        const manual = card.balanceHistory?.find(h => h.updatedBy.role === 'IMPORTADOR' || h.updatedBy.role === 'ADMIN')?.updatedAt;
                        const imported = card.loadingHistory?.[0]?.loadedAt;
                        const latest = manual && imported
                          ? (new Date(manual) > new Date(imported) ? manual : imported)
                          : manual ?? imported;
                        return fmt(latest);
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span><span className="font-medium text-gray-700">{cards.length}</span> cartão(ões)</span>
            <span>Saldo total: <span className="font-semibold text-brand-primary">{fmtMoney(cards.reduce((s, c) => s + Number(c.balance), 0))} €</span></span>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
