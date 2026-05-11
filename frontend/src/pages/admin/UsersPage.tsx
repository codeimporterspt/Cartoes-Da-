import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi, concessoesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { User, Concessao } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar, { FilterField } from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const ALL_BRANDS = [
  { slug: 'byd',      name: 'BYD'      },
  { slug: 'dongfeng', name: 'Dongfeng' },
  { slug: 'farizon',  name: 'Farizon'  },
  { slug: 'geely',    name: 'Geely'    },
  { slug: 'honda',    name: 'Honda'    },
  { slug: 'hyundai',  name: 'Hyundai'  },
  { slug: 'nissan',   name: 'Nissan'   },
  { slug: 'xpeng',    name: 'Xpeng'    },
  { slug: 'zeekr',    name: 'Zeekr'    },
];

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER';
  nif: string;
  brands: string[];
  concessaoPerBrand: Record<string, string>;
}

const emptyForm: UserForm = {
  name: '', email: '', password: '', role: 'USER', nif: '', brands: [], concessaoPerBrand: {},
};

type Tab = 'active' | 'pending' | 'inactive' | 'rejected';

function BrandsCheckboxes({
  selected,
  onChange,
  allowedBrands,
}: {
  selected: string[];
  onChange: (brands: string[]) => void;
  allowedBrands?: string[]; // when set, only these brands can be toggled
}) {
  function toggle(slug: string) {
    if (allowedBrands && !allowedBrands.includes(slug)) return;
    onChange(selected.includes(slug) ? selected.filter(s => s !== slug) : [...selected, slug]);
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {ALL_BRANDS.map(b => {
        const disabled = allowedBrands ? !allowedBrands.includes(b.slug) : false;
        const checked = selected.includes(b.slug);
        return (
          <label key={b.slug} className={`flex items-center gap-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(b.slug)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm">{b.name}</span>
            {disabled && checked && <span className="text-xs text-gray-400">🔒</span>}
          </label>
        );
      })}
    </div>
  );
}

function PerBrandConcessoes({
  brands,
  allConcessoes,
  value,
  onChange,
  allowedBrands,
}: {
  brands: string[];
  allConcessoes: Concessao[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  allowedBrands?: string[];
}) {
  if (brands.length === 0) return null;
  return (
    <div className="space-y-2">
      {brands.map(slug => {
        const brandName = ALL_BRANDS.find(b => b.slug === slug)?.name ?? slug;
        const brandConcessoes = allConcessoes.filter(c => c.brand === slug);
        const disabled = allowedBrands ? !allowedBrands.includes(slug) : false;
        return (
          <div key={slug} className={`grid grid-cols-2 gap-3 items-center ${disabled ? 'opacity-50' : ''}`}>
            <span className="text-sm font-medium text-gray-700">
              {brandName}{disabled && ' 🔒'}
            </span>
            <select
              className="input"
              value={value[slug] || ''}
              onChange={e => onChange({ ...value, [slug]: e.target.value })}
              disabled={disabled}
            >
              <option value="">Selecionar concessão...</option>
              {brandConcessoes.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.dealerCode}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isCurrentAdmin = currentUser?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [concessaoFilter, setConcessaoFilter] = useState('');
  const [formModal, setFormModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [approveModal, setApproveModal] = useState<{ open: boolean; user?: User }>({ open: false });
  const [approveBrands, setApproveBrands] = useState<string[]>([]);
  const [approveAvailableBrands, setApproveAvailableBrands] = useState<string[]>([]);
  const [approveConcessaoPerBrand, setApproveConcessaoPerBrand] = useState<Record<string, string>>({});
  const [approveRole, setApproveRole] = useState<'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER'>('USER');
  const [editAllowedBrands, setEditAllowedBrands] = useState<string[] | undefined>(undefined);
  const [formData, setFormData] = useState<UserForm>(emptyForm);
  const [newPassword, setNewPassword] = useState('');

  const apiBrand = brandFilter && brandFilter !== 'all' ? brandFilter : undefined;
  const apiRole = roleFilter || undefined;
  const apiConcessao = concessaoFilter || undefined;

  const { data: activeRaw = [], isLoading: loadingActive } = useQuery({
    queryKey: ['users', search, brandFilter, roleFilter, concessaoFilter, 'ACTIVE'],
    queryFn: () =>
      usersApi.list({
        status: 'ACTIVE',
        ...(search && { search }),
        ...(apiBrand && { brand: apiBrand }),
        ...(apiRole && { role: apiRole }),
        ...(apiConcessao && { concessaoId: apiConcessao }),
      }).then(r => r.data as User[]),
  });

  const { data: pendingRaw = [], isLoading: loadingPending } = useQuery({
    queryKey: ['users', brandFilter, roleFilter, concessaoFilter, 'PENDING'],
    queryFn: () =>
      usersApi.list({
        hasPendingBrands: 'true',
        ...(apiBrand && { brand: apiBrand }),
        ...(apiConcessao && { concessaoId: apiConcessao }),
      }).then(r => r.data as User[]),
  });

  const { data: inactiveRaw = [], isLoading: loadingInactive } = useQuery({
    queryKey: ['users', brandFilter, roleFilter, concessaoFilter, 'INACTIVE'],
    queryFn: () =>
      usersApi.list({
        status: 'INACTIVE',
        ...(apiBrand && { brand: apiBrand }),
        ...(apiRole && { role: apiRole }),
        ...(apiConcessao && { concessaoId: apiConcessao }),
      }).then(r => r.data as User[]),
  });

  const { data: rejectedRaw = [], isLoading: loadingRejected } = useQuery({
    queryKey: ['users', brandFilter, roleFilter, concessaoFilter, 'REJECTED'],
    queryFn: () =>
      usersApi.list({
        status: 'REJECTED',
        ...(apiBrand && { brand: apiBrand }),
        ...(apiRole && { role: apiRole }),
        ...(apiConcessao && { concessaoId: apiConcessao }),
      }).then(r => r.data as User[]),
  });

  function hasAllBrands(u: User) {
    return u.role === 'ADMIN' || u.brands?.length === ALL_BRANDS.length;
  }

  const activeUsers  = activeRaw
    .filter(u => brandFilter !== 'all' || hasAllBrands(u))
    .filter(u => !roleFilter || u.role === roleFilter);
  const pendingUsers = pendingRaw
    .filter(u => brandFilter !== 'all' || hasAllBrands(u));
  const inactiveUsers = inactiveRaw
    .filter(u => brandFilter !== 'all' || hasAllBrands(u))
    .filter(u => !roleFilter || u.role === roleFilter);
  const rejectedUsers = rejectedRaw
    .filter(u => brandFilter !== 'all' || hasAllBrands(u))
    .filter(u => !roleFilter || u.role === roleFilter);

  const { data: allConcessoes = [] } = useQuery({
    queryKey: ['concessoes-all'],
    queryFn: () => concessoesApi.list().then(r => r.data as Concessao[]),
  });

  const upsert = useMutation({
    mutationFn: () => {
      const concessaoIds = formData.role === 'IMPORTADOR'
        ? allConcessoes.filter(c => formData.brands.includes(c.brand ?? '')).map(c => c.id)
        : formData.role === 'ADMIN' || formData.role === 'VALIDADOR'
          ? []
          : formData.brands.map(b => formData.concessaoPerBrand[b]).filter(Boolean);
      const payload = { ...formData, concessaoIds };
      return formModal.user
        ? usersApi.update(formModal.user.id, payload)
        : usersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(formModal.user ? 'Utilizador atualizado' : 'Utilizador criado');
      setFormModal({ open: false });
      setFormData(emptyForm);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message || 'Erro'),
  });


  const deactivate = useMutation({
    mutationFn: () => usersApi.deactivate(deactivateUser!.id),
    onSuccess: () => {
      toast.success('Utilizador desativado');
      setDeactivateUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erro ao desativar utilizador'),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => {
      toast.success('Utilizador reativado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erro ao reativar utilizador'),
  });

  const resetPwd = useMutation({
    mutationFn: () => usersApi.resetPassword(resetUser!.id, newPassword),
    onSuccess: () => {
      toast.success('Password redefinida');
      setResetUser(null);
      setNewPassword('');
    },
    onError: () => toast.error('Erro ao redefinir password'),
  });

  const approve = useMutation({
    mutationFn: () => {
      const concessaoIds = approveRole === 'IMPORTADOR'
        ? allConcessoes.filter(c => approveBrands.includes(c.brand ?? '')).map(c => c.id)
        : approveRole === 'ADMIN' || approveRole === 'VALIDADOR'
          ? []
          : approveBrands.map(b => approveConcessaoPerBrand[b]).filter(Boolean);
      return usersApi.approve(approveModal.user!.id, approveBrands, concessaoIds, approveRole);
    },
    onSuccess: () => {
      toast.success('Utilizador aprovado');
      setApproveModal({ open: false });
      setApproveBrands([]);
      setApproveAvailableBrands([]);
      setApproveConcessaoPerBrand({});
      setApproveRole('USER');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erro ao aprovar utilizador'),
  });

  const reject = useMutation({
    mutationFn: (id: string) => usersApi.reject(id),
    onSuccess: () => {
      toast.success('Utilizador rejeitado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erro ao rejeitar utilizador'),
  });

  function openCreate() {
    setFormData(emptyForm);
    setFormModal({ open: true });
  }

  function openEdit(u: User) {
    const concessaoPerBrand: Record<string, string> = {};
    u.concessoes?.forEach(c => {
      if (c.brand) concessaoPerBrand[c.brand] = c.id;
    });
    // IMPORTADOR can only toggle brands within their own scope
    setEditAllowedBrands(isCurrentAdmin ? undefined : (currentUser?.brands ?? []));
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      nif: u.nif || '',
      brands: u.brands || [],
      concessaoPerBrand,
    });
    setFormModal({ open: true, user: u });
  }

  function openApprove(u: User) {
    const pending = u.pendingBrands?.length ? u.pendingBrands : effectiveBrands(u);
    // IMPORTADOR only sees the pending brands within their scope
    const available = isCurrentAdmin
      ? pending
      : pending.filter(b => currentUser?.brands?.includes(b));
    setApproveAvailableBrands(available);
    setApproveBrands(available);
    const perBrand: Record<string, string> = {};
    u.concessoes?.forEach(c => { if (c.brand) perBrand[c.brand] = c.id; });
    setApproveConcessaoPerBrand(perBrand);
    setApproveRole('USER');
    setApproveModal({ open: true, user: u });
  }

  function toggleApproveBrand(slug: string) {
    setApproveBrands(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      if (!next.includes(slug)) {
        setApproveConcessaoPerBrand(p => { const c = { ...p }; delete c[slug]; return c; });
      }
      return next;
    });
  }

  const approveValid = approveBrands.length > 0 && (
    approveRole === 'IMPORTADOR' ||
    approveRole === 'ADMIN' ||
    approveRole === 'VALIDADOR' ||
    approveBrands.every(b => !!approveConcessaoPerBrand[b])
  );

  const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy', { locale: pt });

  function effectiveBrands(u: User): string[] {
    if (u.brands?.length) return u.brands;
    const fromConcessoes = [...new Set((u.concessoes ?? []).map(c => c.brand).filter(Boolean) as string[])];
    return fromConcessoes;
  }

  function brandsLabel(u: User) {
    if (u.role === 'ADMIN') return 'Todas';
    const brands = effectiveBrands(u);
    if (brands.length === ALL_BRANDS.length) return 'Todas';
    if (brands.length) return brands.map(slug => ALL_BRANDS.find(b => b.slug === slug)?.name ?? slug).join(', ');
    return '—';
  }

  function concessoesLabel(u: User) {
    if (u.role === 'ADMIN') return 'Todas';
    if (u.concessoes?.length) return u.concessoes.map(c => c.name).join(', ');
    return u.concessao?.name || '—';
  }

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        subtitle={`${activeUsers.length} utilizador(es) ativo(s)`}
        actions={
          <button className="btn-primary btn btn-sm mt-4" onClick={openCreate}>+ Novo Utilizador</button>
        }
      />

      {/* Filters */}
      <div className="mb-4">
        <FilterBar>
          <FilterField label="Marca">
            <select className="input" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="">Selecionar marca...</option>
              <option value="all">Todas</option>
              {ALL_BRANDS.map(b => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Perfil">
            <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Todos os perfis</option>
              <option value="USER">Utilizador</option>
              <option value="IMPORTADOR">Importador</option>
              <option value="VALIDADOR">Validador</option>
              {isCurrentAdmin && <option value="ADMIN">Administrador</option>}
            </select>
          </FilterField>
          <FilterField label="Concessão">
            <select className="input" value={concessaoFilter} onChange={e => setConcessaoFilter(e.target.value)}>
              <option value="">Todas as concessões</option>
              {allConcessoes.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.dealerCode}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Pesquisa">
            <input className="input" placeholder="Nome, email ou NIF..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </FilterField>
        </FilterBar>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('active')}
        >
          Ativos ({activeUsers.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'pending'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('pending')}
        >
          Pendentes
          {pendingUsers.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'inactive'
              ? 'border-gray-500 text-gray-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('inactive')}
        >
          Desativados ({inactiveUsers.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'rejected'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('rejected')}
        >
          Rejeitados ({rejectedUsers.length})
        </button>
      </div>

      {/* ATIVOS */}
      {tab === 'active' && (
        <>
          <div className="card">
            {loadingActive ? (
              <div className="p-8 text-center text-gray-400">A carregar...</div>
            ) : activeUsers.length === 0 ? (
              <EmptyState message="Nenhum utilizador encontrado."
                action={<button className="btn-primary btn btn-sm" onClick={openCreate}>+ Novo Utilizador</button>} />
            ) : (
              <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Perfil</th>
                      <th>Marcas</th>
                      <th>NIF</th>
                      <th>Concessões</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium">{u.name}</td>
                        <td className="text-gray-500 text-xs">{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-blue' : u.role === 'IMPORTADOR' ? 'badge-purple' : u.role === 'VALIDADOR' ? 'badge-green' : 'badge-gray'}`}>
                            {u.role === 'ADMIN' ? 'Admin' : u.role === 'IMPORTADOR' ? 'Importador' : u.role === 'VALIDADOR' ? 'Validador' : 'Utilizador'}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-gray-600">{brandsLabel(u)}</span>
                        </td>
                        <td className="text-gray-500">{u.nif || '—'}</td>
                        <td className="text-xs text-gray-600">{concessoesLabel(u)}</td>
                        <td>{fmt(u.createdAt)}</td>
                        <td>
                          <div className="flex gap-1.5">
                            <button className="btn-ghost btn btn-sm" onClick={() => openEdit(u)}>Editar</button>
                            <button className="btn-ghost btn btn-sm" onClick={() => { setResetUser(u); setNewPassword(''); }}>
                              Password
                            </button>
                            <button className="btn-ghost btn btn-sm text-red-600 hover:bg-red-50" onClick={() => setDeactivateUser(u)}>
                              Desativar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
                <span className="font-medium text-gray-700">{activeUsers.length}</span> utilizador(es) ativo(s)
              </div>
              </>
            )}
          </div>
        </>
      )}

      {/* PENDENTES */}
      {tab === 'pending' && (
        <div className="card">
          {loadingPending ? (
            <div className="p-8 text-center text-gray-400">A carregar...</div>
          ) : pendingUsers.length === 0 ? (
            <EmptyState message="Nenhum registo pendente de aprovação." />
          ) : (
            <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>NIF</th>
                    <th>Marcas solicitadas</th>
                    <th>Concessões solicitadas</th>
                    <th>Registado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => {
                    const myPending = isCurrentAdmin
                      ? u.pendingBrands
                      : u.pendingBrands.filter(b => currentUser?.brands?.includes(b));
                    const otherPending = u.pendingBrands.filter(b => !myPending.includes(b));
                    const pendingConcessoes = (u.concessoes ?? []).filter(c => u.pendingBrands.includes(c.brand ?? ''));
                    return (
                      <tr key={u.id}>
                        <td className="font-medium">{u.name}</td>
                        <td className="text-gray-500 text-xs">{u.email}</td>
                        <td className="text-gray-500">{u.nif || '—'}</td>
                        <td className="text-xs">
                          {myPending.length > 0 && (
                            <span className="text-gray-800">
                              {myPending.map(s => ALL_BRANDS.find(b => b.slug === s)?.name ?? s).join(', ')}
                            </span>
                          )}
                          {otherPending.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              {myPending.length > 0 ? '+ ' : ''}
                              {otherPending.map(s => ALL_BRANDS.find(b => b.slug === s)?.name ?? s).join(', ')} (outro importador)
                            </span>
                          )}
                          {u.pendingBrands.length === 0 && '—'}
                        </td>
                        <td className="text-xs text-gray-600">
                          {pendingConcessoes.length ? pendingConcessoes.map(c => c.name).join(', ') : '—'}
                        </td>
                        <td>{fmt(u.createdAt)}</td>
                        <td>
                          <div className="flex gap-1.5">
                            {myPending.length > 0 && (
                              <button className="btn btn-sm bg-green-600 hover:bg-green-700 text-white" onClick={() => openApprove(u)}>
                                Aprovar
                              </button>
                            )}
                            {myPending.length > 0 && (
                              <button
                                className="btn-danger btn btn-sm"
                                onClick={() => reject.mutate(u.id)}
                                disabled={reject.isPending}
                              >
                                Rejeitar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{pendingUsers.length}</span> utilizador(es) pendente(s)
            </div>
            </>
          )}
        </div>
      )}

      {/* DESATIVADOS */}
      {tab === 'inactive' && (
        <div className="card">
          {loadingInactive ? (
            <div className="p-8 text-center text-gray-400">A carregar...</div>
          ) : inactiveUsers.length === 0 ? (
            <EmptyState message="Nenhum utilizador desativado." />
          ) : (
            <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Perfil</th>
                    <th>Marcas</th>
                    <th>Concessões</th>
                    <th>Desativado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map(u => (
                    <tr key={u.id} className="opacity-70">
                      <td className="font-medium">{u.name}</td>
                      <td className="text-gray-500 text-xs">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>
                          {u.role === 'ADMIN' ? 'Admin' : 'Utilizador'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-500">{brandsLabel(u)}</span>
                      </td>
                      <td className="text-xs text-gray-500">{concessoesLabel(u)}</td>
                      <td>
                        {u.deactivatedAt
                          ? <span className="text-orange-600 font-medium">{fmt(u.deactivatedAt)}</span>
                          : '—'}
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            className="btn-primary btn btn-sm"
                            onClick={() => reactivate.mutate(u.id)}
                            disabled={reactivate.isPending}
                          >
                            Reativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{inactiveUsers.length}</span> utilizador(es) desativado(s)
            </div>
            </>
          )}
        </div>
      )}

      {/* REJEITADOS */}
      {tab === 'rejected' && (
        <div className="card">
          {loadingRejected ? (
            <div className="p-8 text-center text-gray-400">A carregar...</div>
          ) : rejectedUsers.length === 0 ? (
            <EmptyState message="Nenhum utilizador rejeitado." />
          ) : (
            <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>NIF</th>
                    <th>Marcas</th>
                    <th>Registado em</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedUsers.map(u => (
                    <tr key={u.id} className="opacity-70">
                      <td className="font-medium">{u.name}</td>
                      <td className="text-gray-500 text-xs">{u.email}</td>
                      <td className="text-gray-500">{u.nif || '—'}</td>
                      <td>
                        <span className="text-xs text-gray-500">{brandsLabel(u)}</span>
                      </td>
                      <td>{fmt(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{rejectedUsers.length}</span> utilizador(es) rejeitado(s)
            </div>
            </>
          )}
        </div>
      )}

      {/* Create/edit form modal */}
      <Modal
        isOpen={formModal.open}
        onClose={() => { setFormModal({ open: false }); setEditAllowedBrands(undefined); }}
        title={formModal.user ? 'Editar Utilizador' : 'Novo Utilizador'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome *</label>
              <input className="input" value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Email *</label>
              <input type="email" className="input" value={formData.email}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
            </div>
            {!formModal.user && (
              <div className="col-span-2">
                <label className="label">Password *</label>
                <input type="password" className="input" value={formData.password}
                  autoComplete="new-password"
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Perfil</label>
              <select className="input" value={formData.role}
                onChange={e => setFormData(f => ({ ...f, role: e.target.value as 'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER' }))}>
                <option value="USER">Utilizador</option>
                <option value="IMPORTADOR">Importador</option>
                <option value="VALIDADOR">Validador</option>
                {isCurrentAdmin && <option value="ADMIN">Administrador</option>}
              </select>
            </div>
            <div>
              <label className="label">NIF</label>
              <input className="input" value={formData.nif}
                onChange={e => setFormData(f => ({ ...f, nif: e.target.value }))} />
            </div>
            {formData.role !== 'ADMIN' && (
              <>
                <div className="col-span-2">
                  <label className="label">Marcas com acesso</label>
                  <BrandsCheckboxes
                    selected={formData.brands}
                    allowedBrands={editAllowedBrands}
                    onChange={brands => setFormData(f => {
                      const concessaoPerBrand = { ...f.concessaoPerBrand };
                      Object.keys(concessaoPerBrand).forEach(k => {
                        if (!brands.includes(k)) delete concessaoPerBrand[k];
                      });
                      return { ...f, brands, concessaoPerBrand };
                    })}
                  />
                </div>
                {formData.brands.length > 0 && formData.role !== 'IMPORTADOR' && formData.role !== 'VALIDADOR' && (
                  <div className="col-span-2">
                    <label className="label">Concessão por marca</label>
                    <PerBrandConcessoes
                      brands={formData.brands}
                      allConcessoes={allConcessoes}
                      value={formData.concessaoPerBrand}
                      allowedBrands={editAllowedBrands}
                      onChange={concessaoPerBrand => setFormData(f => ({ ...f, concessaoPerBrand }))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-ghost btn" onClick={() => setFormModal({ open: false })}>Cancelar</button>
            <button className="btn-primary btn" onClick={() => upsert.mutate()}
              disabled={upsert.isPending || !formData.name || !formData.email}>
              {upsert.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve modal */}
      <Modal
        isOpen={approveModal.open}
        onClose={() => { setApproveModal({ open: false }); setApproveBrands([]); setApproveConcessaoPerBrand({}); setApproveRole('USER'); }}
        title="Aprovar Utilizador"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Aprovação de <strong>{approveModal.user?.name}</strong>:
          </p>

          {/* Already approved brands */}
          {(approveModal.user?.brands?.length ?? 0) > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Já aprovado: <span className="font-medium text-gray-700">
                {approveModal.user!.brands.map(s => ALL_BRANDS.find(b => b.slug === s)?.name ?? s).join(', ')}
              </span>
            </div>
          )}

          <div>
            <label className="label">Perfil</label>
            <select className="input" value={approveRole} onChange={e => setApproveRole(e.target.value as 'ADMIN' | 'IMPORTADOR' | 'VALIDADOR' | 'USER')}>
              <option value="USER">Utilizador</option>
              <option value="IMPORTADOR">Importador</option>
              <option value="VALIDADOR">Validador</option>
              {isCurrentAdmin && <option value="ADMIN">Administrador</option>}
            </select>
          </div>

          <div>
            <label className="label">Marcas a aprovar</label>
            <div className="grid grid-cols-3 gap-2">
              {approveAvailableBrands.map(slug => {
                const b = ALL_BRANDS.find(x => x.slug === slug);
                if (!b) return null;
                return (
                  <label key={b.slug} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={approveBrands.includes(b.slug)}
                      onChange={() => toggleApproveBrand(b.slug)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm">{b.name}</span>
                  </label>
                );
              })}
            </div>
            {/* Other pending brands outside this user's scope */}
            {!isCurrentAdmin && (approveModal.user?.pendingBrands ?? []).filter(b => !approveAvailableBrands.includes(b)).length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Aguarda aprovação de outro importador:{' '}
                {(approveModal.user!.pendingBrands).filter(b => !approveAvailableBrands.includes(b))
                  .map(s => ALL_BRANDS.find(b => b.slug === s)?.name ?? s).join(', ')}
              </p>
            )}
          </div>

          {approveBrands.length > 0 && approveRole !== 'IMPORTADOR' && approveRole !== 'ADMIN' && approveRole !== 'VALIDADOR' && (
            <div>
              <label className="label">Concessão por marca *</label>
              <PerBrandConcessoes
                brands={approveBrands}
                allConcessoes={allConcessoes}
                value={approveConcessaoPerBrand}
                onChange={setApproveConcessaoPerBrand}
              />
            </div>
          )}

          {approveBrands.length === 0 && (
            <p className="text-xs text-amber-600">Nenhuma marca selecionada.</p>
          )}
          {approveBrands.length > 0 && !approveValid && (
            <p className="text-xs text-amber-600">Seleciona uma concessão para cada marca.</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-ghost btn" onClick={() => { setApproveModal({ open: false }); setApproveBrands([]); setApproveConcessaoPerBrand({}); setApproveRole('USER'); }}>
              Cancelar
            </button>
            <button
              className="btn-primary btn"
              onClick={() => approve.mutate()}
              disabled={approve.isPending || !approveValid}
            >
              {approve.isPending ? 'A aprovar...' : 'Aprovar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title="Redefinir Password" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Redefinir password de <strong>{resetUser?.name}</strong></p>
          <div>
            <label className="label">Nova Password *</label>
            <input type="password" className="input" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost btn" onClick={() => setResetUser(null)}>Cancelar</button>
            <button className="btn-primary btn" onClick={() => resetPwd.mutate()}
              disabled={resetPwd.isPending || newPassword.length < 6}>
              {resetPwd.isPending ? 'A redefinir...' : 'Redefinir'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmModal
        isOpen={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onConfirm={() => deactivate.mutate()}
        title="Desativar Utilizador"
        message={`Tem a certeza que pretende desativar "${deactivateUser?.name}"? O utilizador não conseguirá entrar na plataforma.`}
        confirmLabel="Desativar"
        confirmVariant="danger"
        isLoading={deactivate.isPending}
      />

    </div>
  );
}
