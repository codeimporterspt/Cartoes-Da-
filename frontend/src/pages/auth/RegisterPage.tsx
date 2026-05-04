import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { authApi, concessoesApi } from '../../services/api';
import { Concessao } from '../../types';

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

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nif: '',
    brands: [] as string[],
    concessaoPerBrand: {} as Record<string, string>,
  });

  const { data: allConcessoes = [] } = useQuery({
    queryKey: ['concessoes-public-all'],
    queryFn: () => concessoesApi.list().then(r => r.data as Concessao[]),
  });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function toggleBrand(slug: string) {
    setForm(f => {
      const brands = f.brands.includes(slug)
        ? f.brands.filter(b => b !== slug)
        : [...f.brands, slug];
      const concessaoPerBrand = { ...f.concessaoPerBrand };
      if (!brands.includes(slug)) delete concessaoPerBrand[slug];
      return { ...f, brands, concessaoPerBrand };
    });
  }

  function setConcessao(brandSlug: string, concessaoId: string) {
    setForm(f => ({
      ...f,
      concessaoPerBrand: { ...f.concessaoPerBrand, [brandSlug]: concessaoId },
    }));
  }

  const allBrandsHaveConcessao = form.brands.length > 0 &&
    form.brands.every(b => !!form.concessaoPerBrand[b]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.brands.length === 0) {
      toast.error('Seleciona pelo menos uma marca');
      return;
    }

    if (!allBrandsHaveConcessao) {
      toast.error('Seleciona uma concessão para cada marca');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('As passwords não coincidem');
      return;
    }

    if (form.password.length < 6) {
      toast.error('A password deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const concessaoIds = form.brands.map(b => form.concessaoPerBrand[b]).filter(Boolean);
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        brands: form.brands,
        concessaoIds,
        nif: form.nif || undefined,
      });
      setRegistered(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ '--brand-primary': '#1e3a8a' } as React.CSSProperties}>
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Registo aguarda aprovação</h2>
            <p className="text-sm text-gray-500 mb-6">
              O teu registo foi recebido com sucesso. Um administrador irá analisar e aprovar a tua conta em breve.
            </p>
            <Link to="/login" className="block w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 px-4 rounded-lg text-center transition-colors">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ '--brand-primary': '#1e3a8a' } as React.CSSProperties}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cartões Dá</h1>
          <p className="text-gray-500 mt-1">Caetano Automotive Portugal - Distribution</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-6">Preenche os teus dados para solicitar acesso à plataforma.</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="label">Nome completo *</label>
              <input
                className="input"
                placeholder="João Silva"
                value={form.name}
                onChange={set('name')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Email profissional *</label>
              <input
                type="email"
                className="input"
                placeholder="joao.silva@empresa.pt"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Mín. 6 caracteres"
                    value={form.password}
                    onChange={set('password')}
                    required
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                    {showPassword
                      ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmar password *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={`input pr-10 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="Repetir password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    required
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                    {showConfirm
                      ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 -mt-2">As passwords não coincidem</p>
            )}

            <div>
              <label className="label">NIF</label>
              <input
                className="input"
                placeholder="123456789"
                value={form.nif}
                onChange={set('nif')}
                maxLength={9}
              />
            </div>

            {/* Brand selection */}
            <div>
              <label className="label">
                Marcas para as quais solicita acesso *
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {ALL_BRANDS.map(b => (
                  <label key={b.slug} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.brands.includes(b.slug)}
                      onChange={() => toggleBrand(b.slug)}
                      className="rounded border-gray-400 text-gray-900"
                    />
                    <span className="text-sm">{b.name}</span>
                  </label>
                ))}
              </div>
              {form.brands.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Seleciona pelo menos uma marca.</p>
              )}
            </div>

            {/* Per-brand concessão */}
            {form.brands.length > 0 && (
              <div className="space-y-3">
                <label className="label">Concessão por marca *</label>
                {form.brands.map(slug => {
                  const brandName = ALL_BRANDS.find(b => b.slug === slug)?.name ?? slug;
                  const brandConcessoes = allConcessoes.filter(c => c.brand === slug);
                  return (
                    <div key={slug} className="grid grid-cols-2 gap-3 items-center">
                      <span className="text-sm font-medium text-gray-700">{brandName}</span>
                      <select
                        className="input"
                        value={form.concessaoPerBrand[slug] || ''}
                        onChange={e => setConcessao(slug, e.target.value)}
                      >
                        <option value="">Selecionar concessão...</option>
                        {brandConcessoes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} — {c.dealerCode}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {!allBrandsHaveConcessao && (
                  <p className="text-xs text-amber-600">Seleciona uma concessão para cada marca.</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              disabled={loading || form.password !== form.confirmPassword || form.brands.length === 0 || !allBrandsHaveConcessao}
            >
              {loading ? 'A criar conta...' : 'Solicitar acesso'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Já tens conta?{' '}
          <Link to="/login" className="font-medium text-blue-900 hover:text-blue-700 underline">
            Entrar
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-3">
          © {new Date().getFullYear()} Caetano Automotive Portugal - Distribution. Uso interno exclusivo.
        </p>
      </div>
    </div>
  );
}
