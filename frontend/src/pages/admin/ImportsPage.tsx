import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { importsApi, concessoesApi, downloadBlob } from '../../services/api';
import { PrizeImport } from '../../types';
import { useBrandStore } from '../../store/brandStore';
import PageHeader from '../../components/ui/PageHeader';
import { ImportStatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type ImportType = 'prizes' | 'prizesAftersales' | 'topup' | 'origins' | 'concessoes';

const importTypes: { id: ImportType; label: string; description: string; template: string }[] = [
  {
    id: 'prizes',
    label: 'Importar Prémios Vendas',
    description: 'Importar valores de prémios de vendas por área para carregamento nos cartões',
    template: 'prizes',
  },
  {
    id: 'prizesAftersales',
    label: 'Importar Prémios Após-Venda',
    description: 'Importar valores de prémios de após-venda para carregamento nos cartões',
    template: 'prizes-aftersales',
  },
  {
    id: 'topup',
    label: 'Carregamento Saldo',
    description: 'Carregar saldos nos cartões por upload de valores',
    template: 'topup',
  },
  {
    id: 'origins',
    label: 'Parametrização Origens',
    description: 'Importar/atualizar tipos de origem de prémios',
    template: 'origins',
  },
  {
    id: 'concessoes',
    label: 'Importar Concessões',
    description: 'Importar lista de instalações/concessões com nome e Dealer Code',
    template: 'concessoes',
  },
];

export default function ImportsPage() {
  const qc = useQueryClient();
  const { brand } = useBrandStore();
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dateFilters, setDateFilters] = useState({ startDate: '', endDate: '' });

  const { data: imports = [] } = useQuery({
    queryKey: ['imports', dateFilters],
    queryFn: () => importsApi.list(
      Object.fromEntries(Object.entries(dateFilters).filter(([, v]) => v))
    ).then(r => r.data as PrizeImport[]),
  });

  const { data: concessoes = [] } = useQuery({
    queryKey: ['concessoes', brand.slug],
    queryFn: () => concessoesApi.list(brand.slug).then(r => r.data as { id: string; name: string; dealerCode: string }[]),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<ImportType | null>(null);

  function handleCardImportClick(type: ImportType, e: React.MouseEvent) {
    e.stopPropagation();
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  }

  function handleHiddenFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !pendingTypeRef.current) return;
    doImport.mutate({ type: pendingTypeRef.current, file: f });
  }

  const doImport = useMutation({
    mutationFn: (params?: { type: ImportType; file: File }) => {
      const t = params?.type ?? selectedType;
      const f = params?.file ?? file;
      if (!f || !t) throw new Error('Missing');
      const fd = new FormData();
      fd.append('file', f);
      if (t === 'prizes') return importsApi.importPrizes(fd);
      if (t === 'prizesAftersales') return importsApi.importPrizesAftersales(fd);
      if (t === 'topup') return importsApi.importTopup(fd);
      if (t === 'concessoes') return importsApi.importConcessoes(fd, brand.slug);
      return importsApi.importOrigins(fd);
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setFile(null);
      setSelectedType(null);
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['concessoes'] });
      qc.invalidateQueries({ queryKey: ['concessoes-public'] });
    },
    onError: (e: { response?: { data?: { message?: string; errors?: string[] } } }) => {
      const msg = e.response?.data?.message || 'Erro na importação';
      toast.error(msg);
    },
  });

  async function handleDownloadTemplate(type: string) {
    try {
      const res = await importsApi.downloadTemplate(type);
      downloadBlob(res.data, `template_${type}.xlsx`);
    } catch {
      toast.error('Erro ao descarregar template');
    }
  }

  async function handleDownloadLastFile(type: string) {
    try {
      const res = await importsApi.downloadLastFile(type);
      downloadBlob(res.data, `ultimo_${type}.xlsx`);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(status === 404 ? 'Nenhum ficheiro carregado ainda para esta categoria' : 'Erro ao descarregar ficheiro');
    }
  }

  const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: pt });

  return (
    <div>
      <PageHeader title="Importações" subtitle="Gerir importações de prémios, saldos, origens e concessões" />
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleHiddenFileChange}
      />

      {/* Import actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {importTypes.map(type => (
          <div
            key={type.id}
            className={`card p-5 cursor-pointer transition-all hover:shadow-md ${selectedType === type.id ? 'ring-2 ring-brand-primary' : ''}`}
            onClick={() => setSelectedType(type.id)}
          >
            <h3 className="font-semibold text-gray-800 mb-1">{type.label}</h3>
            <p className="text-xs text-gray-500 mb-4">{type.description}</p>
            <div className="flex flex-col gap-2">
              <button
                className="btn-primary btn btn-sm w-full"
                onClick={(e) => handleCardImportClick(type.id, e)}
                disabled={doImport.isPending}
              >
                {doImport.isPending && pendingTypeRef.current === type.id ? 'A importar...' : 'Importar Ficheiro'}
              </button>
              <button
                className="btn-ghost btn btn-sm w-full"
                onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(type.template); }}
              >
                Descarregar Template
              </button>
              <button
                className="btn-ghost btn btn-sm w-full text-gray-500"
                onClick={(e) => { e.stopPropagation(); handleDownloadLastFile(type.template); }}
              >
                Último ficheiro carregado
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload section */}
      {selectedType && (
        <div className="card p-6 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">
            {importTypes.find(t => t.id === selectedType)?.label}
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="label">Ficheiro Excel (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="input py-1.5"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <button
              className="btn-primary btn"
              onClick={() => doImport.mutate(undefined)}
              disabled={doImport.isPending || !file}
            >
              {doImport.isPending ? 'A importar...' : 'Importar'}
            </button>
            <button className="btn-ghost btn" onClick={() => { setSelectedType(null); setFile(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Concessões actuais */}
      {selectedType === 'concessoes' && concessoes.length > 0 && (
        <div className="card mb-6">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Concessões registadas ({concessoes.length})</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome da Instalação</th>
                  <th>Dealer Code</th>
                </tr>
              </thead>
              <tbody>
                {concessoes.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="font-mono text-sm text-gray-500">{c.dealerCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import history */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Histórico de Importações de Prémios</h2>
          <div className="flex items-center gap-3 text-sm">
            <label className="text-gray-500">De</label>
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={dateFilters.startDate}
              onChange={e => setDateFilters(f => ({ ...f, startDate: e.target.value }))}
            />
            <label className="text-gray-500">Até</label>
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={dateFilters.endDate}
              onChange={e => setDateFilters(f => ({ ...f, endDate: e.target.value }))}
            />
            {(dateFilters.startDate || dateFilters.endDate) && (
              <button
                className="text-gray-400 hover:text-gray-600 text-xs underline"
                onClick={() => setDateFilters({ startDate: '', endDate: '' })}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        {imports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma importação realizada.</div>
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Importado por</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Prémios</th>
                  <th>Erros</th>
                </tr>
              </thead>
              <tbody>
                {imports.map(i => (
                  <tr key={i.id}>
                    <td>{i.importedBy.name}</td>
                    <td>{fmt(i.importedAt)}</td>
                    <td className="text-sm text-gray-600">
                      {i.importType === 'prizes-aftersales' ? 'Após-Venda' : 'Vendas'}
                    </td>
                    <td><ImportStatusBadge status={i.status} /></td>
                    <td>{i.prizeCount}</td>
                    <td className="text-red-500 text-xs max-w-xs truncate">
                      {i.errorDetails || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{imports.length}</span> importação(ões)
          </div>
          </>
        )}
      </div>
    </div>
  );
}
