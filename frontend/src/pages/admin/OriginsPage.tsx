import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { originsApi } from '../../services/api';
import { Origin } from '../../types';
import { useBrandStore } from '../../store/brandStore';
import PageHeader from '../../components/ui/PageHeader';

const EMPTY_FORM = { name: '', area: '', estado: 'S', matricula: 'S', modelo: 'N', description: '' };

type SortKey = 'seq' | 'area' | 'name' | 'estado' | 'matricula' | 'modelo';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="ml-1 text-gray-300 text-xs">↕</span>;
  return <span className="ml-1 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function SNBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
      value === 'S' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {value}
    </span>
  );
}

export default function OriginsPage() {
  const { brand } = useBrandStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('seq');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: rawOrigins = [], isLoading } = useQuery({
    queryKey: ['origins'],
    queryFn: () => originsApi.list().then(r => r.data as Origin[]),
  });

  // xtraFLEX only visible for Hyundai
  const origins = useMemo(
    () =>
      brand.slug === 'hyundai'
        ? rawOrigins
        : rawOrigins.filter(o => o.area?.toLowerCase() !== 'xtraflex'),
    [rawOrigins, brand.slug]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return origins;
    return origins.filter(o =>
      [o.area, o.name, o.estado, o.matricula, o.modelo, o.description].some(
        v => (v || '').toLowerCase().includes(q)
      )
    );
  }, [origins, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortKey === 'seq') {
        va = origins.indexOf(a);
        vb = origins.indexOf(b);
      } else if (sortKey === 'name') {
        va = a.name; vb = b.name;
      } else {
        va = (a as unknown as Record<string, string>)[sortKey] || '';
        vb = (b as unknown as Record<string, string>)[sortKey] || '';
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, origins]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handlePageSize(v: number) {
    setPageSize(v);
    setPage(1);
  }

  const createMutation = useMutation({
    mutationFn: () => originsApi.create({
      name: form.name.trim(),
      area: form.area.trim() || undefined,
      estado: form.estado,
      matricula: form.matricula,
      modelo: form.modelo,
      description: form.description.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Origem criada com sucesso');
      qc.invalidateQueries({ queryKey: ['origins'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Erro ao criar origem');
    },
  });

  function handleExport() {
    const rows = sorted.map((o, i) => ({
      '#': i + 1,
      'Área': o.area || '',
      'Origem': o.name,
      'Estado': o.estado,
      'Matrícula': o.matricula,
      'Modelo': o.modelo,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Origens');
    XLSX.writeFile(wb, 'origens_export.xlsx');
  }

  const th = (key: SortKey, label: string) => (
    <th
      key={key}
      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 border-b border-gray-200"
      onClick={() => handleSort(key)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div>
      <PageHeader
        title="Listagem de Origens"
        subtitle={`${filtered.length} de ${origins.length} origem(ns)`}
        actions={
          <button className="btn-primary btn btn-sm" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
            Nova Origem
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <button
          className="btn-ghost btn btn-sm border border-gray-300 text-gray-600"
          onClick={handleExport}
        >
          Exportar
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Pesquisar:</span>
          <input
            className="input max-w-xs"
            placeholder="Filtrar todas as colunas..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : origins.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma origem configurada.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="table text-sm">
                <thead>
                  <tr>
                    {th('seq', 'ID')}
                    {th('area', 'Área')}
                    {th('name', 'Origem')}
                    {th('estado', 'Estado')}
                    {th('matricula', 'Matrícula')}
                    {th('modelo', 'Modelo')}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((o, i) => (
                    <tr
                      key={o.id}
                      className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}`}
                    >
                      <td className="px-3 py-2 text-gray-400 text-xs w-10 tabular-nums">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{o.area || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{o.name}</td>
                      <td className="px-3 py-2"><SNBadge value={o.estado} /></td>
                      <td className="px-3 py-2"><SNBadge value={o.matricula} /></td>
                      <td className="px-3 py-2"><SNBadge value={o.modelo} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-gray-500"><span className="font-medium text-gray-700">{sorted.length}</span> registo(s)</span>
                <span className="text-gray-300">|</span>
                <span>Página {page} de {totalPages}</span>
                <span className="text-gray-300">|</span>
                <span>Mostrar</span>
                <select
                  className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                  value={pageSize}
                  onChange={e => handlePageSize(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>registos por página</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn-ghost btn btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹ Anterior
                </button>
                <span className="px-2">{page}</span>
                <button
                  className="btn-ghost btn btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Modal criar origem */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Nova Origem</h2>
            <form
              onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <label className="label">Nome *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Área</label>
                <input
                  className="input"
                  placeholder="ex: Vendas, xtraFLEX..."
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['estado', 'matricula', 'modelo'] as const).map(field => (
                  <div key={field}>
                    <label className="label capitalize">{field === 'matricula' ? 'Matrícula' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <select
                      className="input"
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    >
                      <option value="S">S</option>
                      <option value="N">N</option>
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Descrição</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-ghost btn"
                  onClick={() => setShowModal(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn"
                  disabled={createMutation.isPending || !form.name.trim()}
                >
                  {createMutation.isPending ? 'A guardar...' : 'Criar Origem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
