import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { concessoesApi } from '../../services/api';
import { Concessao } from '../../types';
import { useBrandStore } from '../../store/brandStore';
import PageHeader from '../../components/ui/PageHeader';

const EMPTY_FORM = { name: '', dealerCode: '' };

export default function ConcessoesPage() {
  const { brand } = useBrandStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Concessao | null>(null);

  const { data: concessoes = [], isLoading } = useQuery({
    queryKey: ['concessoes', brand.slug],
    queryFn: () => concessoesApi.list(brand.slug).then(r => r.data as Concessao[]),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return concessoes;
    return concessoes.filter(c =>
      c.name.toLowerCase().includes(q) || c.dealerCode.toLowerCase().includes(q)
    );
  }, [concessoes, search]);

  const createMutation = useMutation({
    mutationFn: () =>
      concessoesApi.create({ name: form.name.trim(), dealerCode: form.dealerCode.trim(), brand: brand.slug }),
    onSuccess: () => {
      toast.success('Concessão criada com sucesso');
      qc.invalidateQueries({ queryKey: ['concessoes', brand.slug] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Erro ao criar concessão');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => concessoesApi.delete(id),
    onSuccess: () => {
      toast.success('Concessão eliminada');
      qc.invalidateQueries({ queryKey: ['concessoes', brand.slug] });
      setDeleteTarget(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Erro ao eliminar concessão');
    },
  });

  return (
    <div>
      <PageHeader
        title="Concessões"
        subtitle={`${filtered.length} de ${concessoes.length} concessão(ões) — ${brand.name}`}
        actions={
          <button
            className="btn-primary btn btn-sm"
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
          >
            Nova Concessão
          </button>
        }
      />

      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Pesquisar:</span>
          <input
            className="input max-w-xs"
            placeholder="Nome ou código dealer..."
            value={search}
            onChange={e => { setSearch(e.target.value); }}
          />
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : concessoes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma concessão configurada.</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum resultado para "{search}".</div>
        ) : (
          <>
          <div className="table-container">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">Nome</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200">Dealer Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}`}
                  >
                    <td className="px-3 py-2 text-gray-400 text-xs tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{c.name}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{c.dealerCode}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                        onClick={() => setDeleteTarget(c)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500 flex items-center justify-between">
            <span><span className="font-medium text-gray-700">{filtered.length}</span> de <span className="font-medium text-gray-700">{concessoes.length}</span> concessão(ões)</span>
          </div>
          </>
        )}
      </div>

      {/* Modal — nova concessão */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Nova Concessão</h2>
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
                  placeholder="ex: Caetano Auto Lisboa"
                />
              </div>
              <div>
                <label className="label">Dealer Code *</label>
                <input
                  className="input"
                  value={form.dealerCode}
                  onChange={e => setForm(f => ({ ...f, dealerCode: e.target.value }))}
                  required
                  placeholder="ex: PT001"
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
                  disabled={createMutation.isPending || !form.name.trim() || !form.dealerCode.trim()}
                >
                  {createMutation.isPending ? 'A guardar...' : 'Criar Concessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — confirmar eliminação */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Eliminar Concessão</h2>
            <p className="text-sm text-gray-600 mb-6">
              Tem a certeza que pretende eliminar <span className="font-medium text-gray-800">{deleteTarget.name}</span>?
              Esta ação não pode ser revertida.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn-ghost btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </button>
              <button
                className="btn btn-sm bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
