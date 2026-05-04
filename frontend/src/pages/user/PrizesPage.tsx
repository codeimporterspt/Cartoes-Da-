import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { prizesApi, concessoesApi, usersApi, downloadBlob } from '../../services/api';
import { fmtMoney } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useBrandStore } from '../../store/brandStore';
import { Prize } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { PrizeStatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = [
  { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

export default function PrizesPage() {
  const { user } = useAuthStore();
  const { brand } = useBrandStore();
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState({
    userId: '',
    concessaoId: '',
    year: '',
    month: '',
    search: '',
  });

  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ['prizes', brand.slug, filters],
    queryFn: () => prizesApi.list({
      brand: brand.slug,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }).then(r => r.data as Prize[]),
  });

  const { data: concessoes = [] } = useQuery({
    queryKey: ['concessoes'],
    queryFn: () => concessoesApi.list().then(r => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', brand.slug],
    queryFn: () => usersApi.list({ brand: brand.slug }).then(r => r.data),
    enabled: isAdmin,
  });

  function resetFilters() {
    setFilters({ userId: '', concessaoId: '', year: '', month: '', search: '' });
  }

  async function handleExport() {
    try {
      const res = await prizesApi.exportExcel({
        brand: brand.slug,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });
      downloadBlob(res.data, 'premios.xlsx');
    } catch {
      toast.error('Erro ao exportar');
    }
  }

  const fmt = (d?: string) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '—';

  return (
    <div>
      <PageHeader
        title="Prémios"
        subtitle={`${prizes.length} resultado(s)`}
        actions={
          <button className="btn-secondary btn btn-sm" onClick={handleExport}>
            Exportar Excel
          </button>
        }
      />

      <FilterBar onReset={resetFilters}>
        <FilterField label="Pesquisa">
          <input
            className="input"
            placeholder="Pesquisar..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </FilterField>

        {isAdmin && (
          <FilterField label="Utilizador">
            <select
              className="input"
              value={filters.userId}
              onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}
            >
              <option value="">Todos</option>
              {(users as { id: string; name: string; email: string }[]).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </FilterField>
        )}

        <FilterField label="Concessão">
          <select
            className="input"
            value={filters.concessaoId}
            onChange={e => setFilters(f => ({ ...f, concessaoId: e.target.value }))}
          >
            <option value="">Todas</option>
            {(concessoes as { id: string; name: string }[]).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Ano">
          <select
            className="input"
            value={filters.year}
            onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
          >
            <option value="">Todos</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterField>

        <FilterField label="Mês">
          <select
            className="input"
            value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
          >
            <option value="">Todos</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : prizes.length === 0 ? (
          <EmptyState message="Nenhum prémio encontrado com os filtros selecionados." />
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {isAdmin && <th>Utilizador</th>}
                  {isAdmin && <th>Email</th>}
                  <th>Concessão</th>
                  <th>Área</th>
                  <th>Origem</th>
                  <th>Matrícula</th>
                  <th>Modelo</th>
                  <th>Valor</th>
                  <th>Período</th>
                  <th>Estado</th>
                  <th>Data Importação</th>
                  <th>Data Validação</th>
                  <th>Data Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map(p => (
                  <tr key={p.id}>
                    {isAdmin && <td className="font-medium">{p.user.name}</td>}
                    {isAdmin && <td className="text-gray-500 text-xs">{p.user.email}</td>}
                    <td>{p.concessao.name}</td>
                    <td>{p.area || '—'}</td>
                    <td>{p.origin?.name || '—'}</td>
                    <td>{p.origin?.matricula || '—'}</td>
                    <td>{p.origin?.modelo || '—'}</td>
                    <td className="font-semibold text-brand-primary">
                      {fmtMoney(Number(p.value))} €
                    </td>
                    <td>{p.period}</td>
                    <td><PrizeStatusBadge status={p.status} /></td>
                    <td>{fmt(p.importDate)}</td>
                    <td>{fmt(p.validationDate)}</td>
                    <td>{fmt(p.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{prizes.length}</span> prémio(s)
          </div>
          </>
        )}
      </div>
    </div>
  );
}
