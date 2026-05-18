import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cardsApi, concessoesApi, usersApi } from '../../services/api';
import api from '../../services/api';
import { fmtMoney } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useBrandStore } from '../../store/brandStore';
import { Card, Concessao } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CardStatusBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function CardsPage() {
  const { user } = useAuthStore();
  const { brand } = useBrandStore();
  const isAdmin = user?.role === 'ADMIN';
  const isElevated = isAdmin || user?.role === 'IMPORTADOR';
  const qc = useQueryClient();

  const [filters, setFilters] = useState({ userId: '', concessaoId: '', status: '', search: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [balanceModalCard, setBalanceModalCard] = useState<Card | null>(null);
  const [inactivateCard, setInactivateCard] = useState<Card | null>(null);
  const [transferCard, setTransferCard] = useState<Card | null>(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [declarationForm, setDeclarationForm] = useState({ name: '', nif: '', cardNumber: '', seriesNumber: '' });
  const [declarationDownloading, setDeclarationDownloading] = useState(false);

  // Form state
  const [createForm, setCreateForm] = useState({
    concessaoId: '', cardNumber: '', seriesNumber: '', declaration: null as File | null,
    userId: '',
  });
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNotes, setBalanceNotes] = useState('');
  const [transferUserId, setTransferUserId] = useState('');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards', brand.slug, filters],
    queryFn: () => cardsApi.list({
      brand: brand.slug,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    }).then(r => r.data as Card[]),
  });

  const { data: selectedCard } = useQuery({
    queryKey: ['card', selectedCardId],
    queryFn: () => cardsApi.getById(selectedCardId).then(r => r.data as Card),
    enabled: !!selectedCardId,
  });

  const { data: concessoes = [] } = useQuery({
    queryKey: ['concessoes', brand.slug],
    queryFn: () => concessoesApi.list(brand.slug).then(r => r.data as Concessao[]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', brand.slug],
    queryFn: () => usersApi.list({ brand: brand.slug }).then(r => r.data),
    enabled: isElevated,
  });

  const availableConcessoes: Concessao[] = isElevated
    ? concessoes
    : concessoes.filter(c => user?.concessaoIds?.includes(c.id) ?? false);

  const createCard = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('concessaoId', createForm.concessaoId);
      fd.append('cardNumber', createForm.cardNumber);
      fd.append('seriesNumber', createForm.seriesNumber);
      if (isAdmin && createForm.userId) fd.append('userId', createForm.userId);
      if (createForm.declaration) fd.append('declaration', createForm.declaration);
      return cardsApi.create(fd);
    },
    onSuccess: () => {
      toast.success('Cartão submetido para validação');
      setCreateModalOpen(false);
      setCreateForm({ concessaoId: '', cardNumber: '', seriesNumber: '', declaration: null, userId: '' });
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message || 'Erro ao criar cartão'),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => cardsApi.reactivate(id),
    onSuccess: () => {
      toast.success('Cartão reativado');
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card', selectedCardId] });
    },
    onError: () => toast.error('Erro ao reativar cartão'),
  });

  const updateBalance = useMutation({
    mutationFn: () =>
      cardsApi.updateBalance(balanceModalCard!.id, parseFloat(balanceAmount), balanceNotes),
    onSuccess: () => {
      toast.success('Saldo atualizado');
      setBalanceModalCard(null);
      setBalanceAmount('');
      setBalanceNotes('');
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card', selectedCardId] });
    },
    onError: () => toast.error('Erro ao atualizar saldo'),
  });

  const inactivate = useMutation({
    mutationFn: () => cardsApi.inactivate(inactivateCard!.id),
    onSuccess: () => {
      toast.success('Cartão inativado');
      setInactivateCard(null);
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
    onError: () => toast.error('Erro ao inativar cartão'),
  });

  const transfer = useMutation({
    mutationFn: () => cardsApi.transfer(transferCard!.id, transferUserId),
    onSuccess: () => {
      toast.success('Cartão transferido');
      setTransferCard(null);
      setTransferUserId('');
      qc.invalidateQueries({ queryKey: ['cards'] });
    },
    onError: () => toast.error('Erro ao transferir cartão'),
  });

  const fmt = (d?: string) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: pt }) : '—';

  function openDeclarationModal() {
    setDeclarationForm({ name: '', nif: '', cardNumber: '', seriesNumber: '' });
    setDeclarationModalOpen(true);
  }

  async function downloadFilledDeclaration() {
    setDeclarationDownloading(true);
    try {
      const res = await api.get('/cards/declaration-template', { responseType: 'text' });
      let rtf: string = res.data;

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();

      rtf = rtf.replace('___/___/______', `${dd}/${mm}/${yyyy}`);
      rtf = rtf.replace(
        /Eu, _+,/,
        `Eu, ${declarationForm.name || '______________________________________________'},`
      );
      rtf = rtf.replace(
        /NIF n\.º _+,/,
        `NIF n.º ${declarationForm.nif || '___________________'},`
      );
      rtf = rtf.replace(
        /Número do Cartão: _+/,
        `Número do Cartão: ${declarationForm.cardNumber || '___________________'}`
      );
      rtf = rtf.replace(
        /Número de Série: _+/,
        `Número de Série: ${declarationForm.seriesNumber || '___________________'}`
      );

      const blob = new Blob([rtf], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'declaracao_cartao_da.rtf';
      a.click();
      URL.revokeObjectURL(url);
      setDeclarationModalOpen(false);
    } catch {
      toast.error('Erro ao gerar declaração');
    } finally {
      setDeclarationDownloading(false);
    }
  }

  // Cards belonging to the current user (for card management section)
  const myCards = isAdmin
    ? cards
    : cards.filter(c => c.userId === user?.id);

  return (
    <div>
      <PageHeader
        title="Consulta Cartões"
        subtitle={`${cards.length} cartão(ões)`}
        actions={
          <button className="btn-primary btn btn-sm" onClick={() => {
            setCreateForm(f => ({
              ...f,
              concessaoId: !isElevated && availableConcessoes.length === 1 ? availableConcessoes[0].id : f.concessaoId,
            }));
            setCreateModalOpen(true);
          }}>
            + Criar Cartão
          </button>
        }
      />

      <FilterBar onReset={() => setFilters({ userId: '', concessaoId: '', status: '', search: '' })}>
        <FilterField label="Pesquisa">
          <input
            className="input"
            placeholder="Pesquisar..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </FilterField>
        <FilterField label="Estado">
          <select className="input" value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="PENDING">Pendente</option>
            <option value="REJECTED">Rejeitado</option>
          </select>
        </FilterField>
        {isAdmin && (
          <FilterField label="Utilizador">
            <select className="input" value={filters.userId}
              onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Todos</option>
              {(users as { id: string; name: string; email: string }[]).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </FilterField>
        )}
        <FilterField label="Concessão">
          <select className="input" value={filters.concessaoId}
            onChange={e => setFilters(f => ({ ...f, concessaoId: e.target.value }))}>
            <option value="">Todas</option>
            {concessoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FilterField>
      </FilterBar>

      {/* Card management section */}
      {myCards.length > 0 && (
        <div className="card mb-5">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800">Gestão do Cartão</h2>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <label className="label mb-0">Cartão:</label>
              <select
                className="input max-w-xs"
                value={selectedCardId}
                onChange={e => setSelectedCardId(e.target.value)}
              >
                <option value="">Selecionar cartão...</option>
                {myCards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.cardNumber} — {c.concessao.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedCard && (
              <div className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Saldo Atual</p>
                    <p className="text-xl font-bold text-brand-primary">
                      {fmtMoney(Number(selectedCard.balance))} €
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Estado</p>
                    <div className="mt-1"><CardStatusBadge status={selectedCard.status} /></div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Nº Cartão</p>
                    <p className="text-sm font-medium">{selectedCard.cardNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Nº Série</p>
                    <p className="text-sm font-medium">{selectedCard.seriesNumber}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-5">
                  {selectedCard.status === 'ACTIVE' && (
                    <button
                      className="btn-primary btn btn-sm"
                      onClick={() => { setBalanceModalCard(selectedCard); }}
                    >
                      Atualizar Saldo
                    </button>
                  )}
                  {selectedCard.status === 'ACTIVE' && (
                    <button
                      className="btn-danger btn btn-sm"
                      onClick={() => setInactivateCard(selectedCard)}
                    >
                      Inativar
                    </button>
                  )}
                  {selectedCard.status === 'INACTIVE' && (
                    <button
                      className="btn-success btn btn-sm"
                      onClick={() => reactivate.mutate(selectedCard.id)}
                      disabled={reactivate.isPending}
                    >
                      Reativar
                    </button>
                  )}
                  {isElevated && (
                    <button
                      className="btn-secondary btn btn-sm"
                      onClick={() => setTransferCard(selectedCard)}
                    >
                      Transferir
                    </button>
                  )}
                </div>

                {/* Balance history */}
                {selectedCard.balanceHistory && selectedCard.balanceHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico de Saldo</h3>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Valor Movimento</th>
                            <th>Saldo</th>
                            <th>Atualizado por</th>
                            <th>Data</th>
                            <th>Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCard.balanceHistory.map(h => (
                            <tr key={h.id}>
                              <td className={`font-medium ${Number(h.movementValue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Number(h.movementValue) >= 0 ? '+' : ''}{fmtMoney(Number(h.movementValue))} €
                              </td>
                              <td className="font-semibold">{fmtMoney(Number(h.balanceValue))} €</td>
                              <td>{h.updatedBy.name}</td>
                              <td>{fmt(h.updatedAt)}</td>
                              <td className="text-gray-500">{h.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards list */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : cards.length === 0 ? (
          <EmptyState
            message="Não foram encontrados cartões."
            action={
              <button className="btn-primary btn btn-sm" onClick={() => {
                setCreateForm(f => ({
                  ...f,
                  concessaoId: !isElevated && availableConcessoes.length === 1 ? availableConcessoes[0].id : f.concessaoId,
                }));
                setCreateModalOpen(true);
              }}>
                + Criar Cartão
              </button>
            }
          />
        ) : (
          <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {isAdmin && <th>Utilizador</th>}
                  {isAdmin && <th>Email</th>}
                  <th>Concessão</th>
                  <th>Nº Cartão</th>
                  <th>Nº Série</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Data Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(card => (
                  <tr key={card.id}>
                    {isAdmin && <td className="font-medium">{card.user.name}</td>}
                    {isAdmin && <td className="text-gray-500 text-xs">{card.user.email}</td>}
                    <td>{card.concessao.name}</td>
                    <td className="font-mono text-sm">{card.cardNumber}</td>
                    <td>{card.seriesNumber}</td>
                    <td className="font-semibold text-brand-primary">
                      {fmtMoney(Number(card.balance))} €
                    </td>
                    <td><CardStatusBadge status={card.status} /></td>
                    <td>{fmt(card.createdAt)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          className="btn-ghost btn btn-sm"
                          onClick={() => setSelectedCardId(card.id)}
                        >
                          Ver
                        </button>
                        {card.status === 'ACTIVE' && (isAdmin || card.userId === user?.id) && (
                          <button
                            className="btn-danger btn btn-sm"
                            onClick={() => setInactivateCard(card)}
                          >
                            Inativar
                          </button>
                        )}
                        {card.status === 'INACTIVE' && (isAdmin || card.userId === user?.id) && (
                          <button
                            className="btn-success btn btn-sm"
                            onClick={() => reactivate.mutate(card.id)}
                            disabled={reactivate.isPending}
                          >
                            Reativar
                          </button>
                        )}
                        {isElevated && (
                          <button
                            className="btn-secondary btn btn-sm"
                            onClick={() => setTransferCard(card)}
                          >
                            Transferir
                          </button>
                        )}
                      </div>
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

      {/* Create Card Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Criar Cartão">
        <div className="space-y-4">
          {isAdmin && (
            <div>
              <label className="label">Utilizador</label>
              <select className="input" value={createForm.userId}
                onChange={e => setCreateForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Próprio utilizador</option>
                {(users as { id: string; name: string }[]).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Concessão *</label>
            {!isElevated && availableConcessoes.length === 1 ? (
              <input className="input bg-gray-50" value={availableConcessoes[0].name} disabled />
            ) : (
              <select className="input" value={createForm.concessaoId}
                onChange={e => setCreateForm(f => ({ ...f, concessaoId: e.target.value }))}
                required>
                <option value="">Selecionar...</option>
                {availableConcessoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="label">Número do Cartão *</label>
            <input className="input" value={createForm.cardNumber}
              onChange={e => setCreateForm(f => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="19 dígitos" maxLength={19} inputMode="numeric" required />
          </div>
          <div>
            <label className="label">Número de Série *</label>
            <input className="input" value={createForm.seriesNumber}
              onChange={e => setCreateForm(f => ({ ...f, seriesNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="10 dígitos" maxLength={10} inputMode="numeric" required />
          </div>
          <div>
            <label className="label">Declaração assinada (PDF/DOC)</label>
            <input type="file" className="input py-1.5"
              accept=".pdf,.doc,.docx"
              onChange={e => setCreateForm(f => ({ ...f, declaration: e.target.files?.[0] || null }))} />
            <button
              type="button"
              onClick={openDeclarationModal}
              className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download template declaração
            </button>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            Após submissão, o cartão ficará pendente de validação pela equipa financeira.
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-ghost btn" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary btn"
              onClick={() => createCard.mutate()}
              disabled={createCard.isPending || !createForm.concessaoId || createForm.cardNumber.length !== 19 || createForm.seriesNumber.length !== 10}
            >
              {createCard.isPending ? 'A submeter...' : 'Submeter'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Balance update modal */}
      <Modal isOpen={!!balanceModalCard} onClose={() => setBalanceModalCard(null)} title="Atualizar Saldo">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <span className="text-gray-500">Cartão: </span>
            <span className="font-medium">{balanceModalCard?.cardNumber}</span>
            <span className="text-gray-500 ml-4">Saldo atual: </span>
            <span className="font-bold text-brand-primary">
              {fmtMoney(Number(balanceModalCard?.balance ?? 0))} €
            </span>
          </div>
          <div>
            <label className="label">Valor do Movimento (€) *</label>
            <input type="number" step="0.01" className="input"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              placeholder="ex: 250.00" />
          </div>
          <div>
            <label className="label">Notas</label>
            <input className="input" value={balanceNotes}
              onChange={e => setBalanceNotes(e.target.value)}
              placeholder="Opcional" />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost btn" onClick={() => setBalanceModalCard(null)}>Cancelar</button>
            <button
              className="btn-primary btn"
              onClick={() => updateBalance.mutate()}
              disabled={updateBalance.isPending || !balanceAmount}
            >
              {updateBalance.isPending ? 'A atualizar...' : 'Atualizar Saldo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Inactivate modal */}
      <ConfirmModal
        isOpen={!!inactivateCard}
        onClose={() => setInactivateCard(null)}
        onConfirm={() => inactivate.mutate()}
        title="Inativar Cartão"
        message={`Tem a certeza que pretende inativar o cartão ${inactivateCard?.cardNumber}? Esta ação impedirá futuras atualizações de saldo.`}
        confirmLabel="Inativar"
        confirmVariant="danger"
        isLoading={inactivate.isPending}
      />

      {/* Declaration template modal */}
      <Modal isOpen={declarationModalOpen} onClose={() => setDeclarationModalOpen(false)} title="Preencher Declaração">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Preencha os campos para gerar a declaração pré-preenchida. Pode editar antes de imprimir.
          </p>
          <div>
            <label className="label">Nome completo *</label>
            <input
              className="input"
              value={declarationForm.name}
              onChange={e => setDeclarationForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nome como consta no documento de identidade"
            />
          </div>
          <div>
            <label className="label">NIF *</label>
            <input
              className="input"
              value={declarationForm.nif}
              onChange={e => setDeclarationForm(f => ({ ...f, nif: e.target.value.replace(/\D/g, '') }))}
              placeholder="123456789"
              maxLength={9}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label">Nº Cartão *</label>
            <input
              className="input"
              value={declarationForm.cardNumber}
              onChange={e => setDeclarationForm(f => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="19 dígitos"
              maxLength={19}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label">Nº Série *</label>
            <input
              className="input"
              value={declarationForm.seriesNumber}
              onChange={e => setDeclarationForm(f => ({ ...f, seriesNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="10 dígitos"
              maxLength={10}
              inputMode="numeric"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-ghost btn" onClick={() => setDeclarationModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary btn"
              onClick={downloadFilledDeclaration}
              disabled={declarationDownloading}
            >
              {declarationDownloading ? 'A gerar...' : 'Download Declaração'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal isOpen={!!transferCard} onClose={() => setTransferCard(null)} title="Transferir Cartão">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Transferir cartão <strong>{transferCard?.cardNumber}</strong> para outro utilizador.
          </p>
          <div>
            <label className="label">Utilizador destino *</label>
            <select className="input" value={transferUserId}
              onChange={e => setTransferUserId(e.target.value)}>
              <option value="">Selecionar...</option>
              {(users as { id: string; name: string }[])
                .filter(u => u.id !== transferCard?.userId)
                .map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost btn" onClick={() => setTransferCard(null)}>Cancelar</button>
            <button
              className="btn-primary btn"
              onClick={() => transfer.mutate()}
              disabled={transfer.isPending || !transferUserId}
            >
              {transfer.isPending ? 'A transferir...' : 'Transferir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
