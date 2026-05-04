import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { prizesApi, concessoesApi, usersApi, originsApi, downloadBlob } from '../../services/api';
import { fmtMoney } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { Prize, Concessao } from '../../types';
import { PrizeStatusBadge } from '../../components/ui/StatusBadge';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useBrandStore } from '../../store/brandStore';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function ValidationPage() {
  const qc = useQueryClient();
  const { brand } = useBrandStore();
  const { user } = useAuthStore();
  const canValidate = user?.role === 'ADMIN' || user?.role === 'VALIDADOR';
  const [filters, setFilters] = useState({ userId: '', concessaoId: '', area: '', originId: '', search: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [actionIds, setActionIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['prizes-pending', brand.slug, filters],
    queryFn: () => prizesApi.getPending({
      brand: brand.slug,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }).then(r => r.data as { prizes: Prize[]; total: number }),
  });

  const prizes = data?.prizes || [];
  const total = data?.total || 0;

  const { data: concessoes = [] } = useQuery({
    queryKey: ['concessoes', brand.slug],
    queryFn: () => concessoesApi.list(brand.slug).then(r => r.data as Concessao[]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
  });

  const { data: origins = [] } = useQuery({
    queryKey: ['origins'],
    queryFn: () => originsApi.list().then(r => r.data),
  });

  const approve = useMutation({
    mutationFn: (ids: string[]) => prizesApi.approve(ids),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} prémio(s) aprovado(s)`);
      setSelected([]);
      setActionIds([]);
      setModalType(null);
      qc.invalidateQueries({ queryKey: ['prizes-pending'] });
    },
    onError: () => toast.error('Erro ao validar prémios'),
  });

  const reject = useMutation({
    mutationFn: (ids: string[]) => prizesApi.reject(ids, rejectReason),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} prémio(s) rejeitado(s)`);
      setSelected([]);
      setActionIds([]);
      setRejectReason('');
      setModalType(null);
      qc.invalidateQueries({ queryKey: ['prizes-pending'] });
    },
    onError: () => toast.error('Erro ao rejeitar prémios'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => prizesApi.deletePending(id),
    onSuccess: () => {
      toast.success('Prémio eliminado');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['prizes-pending'] });
    },
    onError: () => toast.error('Erro ao eliminar prémio'),
  });

  function openModal(type: 'approve' | 'reject', ids: string[]) {
    setActionIds(ids);
    setModalType(type);
  }

  function toggleAll() {
    setSelected(selected.length === prizes.length ? [] : prizes.map(p => p.id));
  }

  function toggleOne(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function handleExport() {
    try {
      const res = await prizesApi.exportExcel({ view: 'validation', brand: brand.slug, status: 'PENDENTE', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      downloadBlob(res.data, 'premios_pendentes.xlsx');
    } catch {
      toast.error('Erro ao exportar');
    }
  }

  const fmt = (d?: string) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '—';

  return (
    <div className="pb-24">
      <PageHeader
        title="Validação Prémios"
        subtitle={`${prizes.length} prémio(s) pendente(s)${selected.length > 0 ? ` • ${selected.length} selecionado(s)` : ''}`}
        actions={
          <button className="btn-ghost btn btn-sm" onClick={handleExport}>
            Exportar
          </button>
        }
      />

      {(filters.userId || filters.concessaoId || filters.area || filters.originId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-blue-700">
            Total filtrado: <strong>{fmtMoney(total)} €</strong> ({prizes.length} prémios)
          </p>
        </div>
      )}

      <FilterBar onReset={() => setFilters({ userId: '', concessaoId: '', area: '', originId: '', search: '' })}>
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
        <FilterField label="Área">
          <input className="input" placeholder="Filtrar área..." value={filters.area}
            onChange={e => setFilters(f => ({ ...f, area: e.target.value }))} />
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
      </FilterBar>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : prizes.length === 0 ? (
          <EmptyState message="Nenhum prémio pendente de validação." />
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {canValidate && (
                    <th className="w-10">
                      <input type="checkbox"
                        checked={prizes.length > 0 && selected.length === prizes.length}
                        onChange={toggleAll}
                        className="rounded"
                        title="Selecionar todos"
                      />
                    </th>
                  )}
                  <th>Utilizador</th>
                  <th>Concessão</th>
                  <th>Área</th>
                  <th>Origem</th>
                  <th>Matrícula</th>
                  <th>Modelo</th>
                  <th>Valor</th>
                  <th>Período</th>
                  <th>Data Importação</th>
                  <th>Estado</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {prizes.map(p => (
                  <tr key={p.id} className={selected.includes(p.id) ? 'bg-blue-50' : ''}>
                    {canValidate && (
                      <td>
                        <input type="checkbox" checked={selected.includes(p.id)}
                          onChange={() => toggleOne(p.id)} className="rounded" />
                      </td>
                    )}
                    <td className="font-medium">{p.user.name}</td>
                    <td>{p.concessao.name}</td>
                    <td>{p.area || '—'}</td>
                    <td>{p.origin?.name || '—'}</td>
                    <td>{p.origin?.matricula || '—'}</td>
                    <td>{p.origin?.modelo || '—'}</td>
                    <td className="font-semibold text-brand-primary">
                      {fmtMoney(Number(p.value))} €
                    </td>
                    <td>{p.period}</td>
                    <td>{fmt(p.importDate)}</td>
                    <td><PrizeStatusBadge status={p.status} /></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canValidate && (
                          <>
                            <button
                              className="btn-success btn btn-sm"
                              onClick={() => openModal('approve', [p.id])}
                              title="Validar este prémio"
                            >
                              Validar
                            </button>
                            <button
                              className="btn-danger btn btn-sm"
                              onClick={() => openModal('reject', [p.id])}
                              title="Rejeitar este prémio"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        <button
                          className="btn-ghost btn btn-sm text-red-500 hover:text-red-700"
                          onClick={() => setDeleteId(p.id)}
                          title="Eliminar este prémio"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span><span className="font-medium text-gray-700">{prizes.length}</span> prémio(s)</span>
            <span>Total: <span className="font-semibold text-brand-primary">{fmtMoney(prizes.reduce((s, p) => s + Number(p.value), 0))} €</span></span>
          </div>
          </>
        )}
      </div>

      {/* Bulk action bar — fixed at bottom when items selected */}
      {canValidate && selected.length > 0 && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 mr-2">
            {selected.length} prémio(s) selecionado(s)
          </span>
          <button
            className="btn-success btn btn-sm"
            onClick={() => openModal('approve', selected)}
          >
            Validar em massa ({selected.length})
          </button>
          <button
            className="btn-danger btn btn-sm"
            onClick={() => openModal('reject', selected)}
          >
            Rejeitar em massa ({selected.length})
          </button>
          <button
            className="btn-ghost btn btn-sm ml-auto"
            onClick={() => setSelected([])}
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Approve modal */}
      <ConfirmModal
        isOpen={modalType === 'approve'}
        onClose={() => setModalType(null)}
        onConfirm={() => approve.mutate(actionIds)}
        title="Validar Prémios"
        message={`Confirma a aprovação de ${actionIds.length} prémio(s)?`}
        confirmLabel="Validar"
        confirmVariant="success"
        isLoading={approve.isPending}
      />

      {/* Delete modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId!)}
        title="Eliminar Prémio"
        message="Tem a certeza que pretende eliminar este prémio? Esta ação é irreversível."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Reject modal */}
      <Modal isOpen={modalType === 'reject'} onClose={() => setModalType(null)} title="Rejeitar Prémios">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vai rejeitar <strong>{actionIds.length}</strong> prémio(s). Por favor indique o motivo.
          </p>
          <div>
            <label className="label">Motivo de rejeição *</label>
            <textarea className="input" rows={3} value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost btn" onClick={() => setModalType(null)}>Cancelar</button>
            <button className="btn-danger btn" onClick={() => reject.mutate(actionIds)}
              disabled={reject.isPending || !rejectReason.trim()}>
              {reject.isPending ? 'A rejeitar...' : 'Rejeitar'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
