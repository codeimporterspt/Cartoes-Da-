import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cardLoadingApi, usersApi, originsApi, downloadBlob } from '../../services/api';
import { fmtMoney } from '../../utils/format';
import { useBrandStore } from '../../store/brandStore';
import { CardLoadingHistory } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function CardLoadingHistoryPage() {
  const { brand } = useBrandStore();
  const [filters, setFilters] = useState({
    userId: '', startDate: '', endDate: '', originId: '', search: '',
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['card-loading', brand.slug, filters],
    queryFn: () => cardLoadingApi.list({
      brand: brand.slug,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }).then(r => r.data as CardLoadingHistory[]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', brand.slug],
    queryFn: () => usersApi.list({ brand: brand.slug }).then(r => r.data),
  });

  const { data: origins = [] } = useQuery({
    queryKey: ['origins'],
    queryFn: () => originsApi.list().then(r => r.data),
  });

  async function handleExport() {
    try {
      const res = await cardLoadingApi.exportExcel({
        brand: brand.slug,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      downloadBlob(res.data, 'historico_carregamentos.xlsx');
    } catch {
      toast.error('Erro ao exportar');
    }
  }

  const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: pt });

  return (
    <div>
      <PageHeader
        title="Histórico de Carregamentos"
        subtitle={`${history.length} registo(s)`}
        actions={
          <button className="btn-secondary btn btn-sm" onClick={handleExport}>
            Exportar Excel
          </button>
        }
      />

      <FilterBar onReset={() => setFilters({ userId: '', startDate: '', endDate: '', originId: '', search: '' })}>
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
        <FilterField label="Origem">
          <select className="input" value={filters.originId}
            onChange={e => setFilters(f => ({ ...f, originId: e.target.value }))}>
            <option value="">Todas</option>
            {(origins as { id: string; name: string }[]).map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Data Início">
          <input type="date" className="input" value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
        </FilterField>
        <FilterField label="Data Fim">
          <input type="date" className="input" value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
        </FilterField>
      </FilterBar>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : history.length === 0 ? (
          <EmptyState message="Nenhum registo de carregamento encontrado." />
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Utilizador</th>
                  <th>Concessão</th>
                  <th>Origem</th>
                  <th>Login</th>
                  <th>NIF</th>
                  <th>Nº Cartão</th>
                  <th>Valor Movimento</th>
                  <th>Valor Saldo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="font-medium">{h.user.name}</td>
                    <td>{h.user.concessao?.name || '—'}</td>
                    <td>{h.origin?.name || '—'}</td>
                    <td className="text-gray-500 text-xs">{h.extranetLogin || h.user.email}</td>
                    <td className="text-gray-500">{h.user.nif || '—'}</td>
                    <td className="font-mono text-sm">{h.card.cardNumber}</td>
                    <td className={`font-semibold ${Number(h.movementValue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(h.movementValue) >= 0 ? '+' : ''}{fmtMoney(Number(h.movementValue))} €
                    </td>
                    <td className="font-bold text-brand-primary">{fmtMoney(Number(h.balanceValue))} €</td>
                    <td className="text-gray-500">{fmt(h.loadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span><span className="font-medium text-gray-700">{history.length}</span> registo(s)</span>
            <span>Total carregado: <span className="font-semibold text-brand-primary">{fmtMoney(history.reduce((s, h) => s + Number(h.movementValue), 0))} €</span></span>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
