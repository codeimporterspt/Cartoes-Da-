import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBrandStore } from '../../store/brandStore';

const userNavItems = [
  { to: '/premios', label: 'Prémios' },
  { to: '/cartoes', label: 'Consulta Cartões' },
];

const adminNavItems = [
  { to: '/backoffice/validacao', label: 'Validação Prémios' },
  { to: '/backoffice/saldo-cartao', label: 'Saldo Cartão' },
  { to: '/backoffice/origens', label: 'Origens' },
  { to: '/backoffice/cartoes', label: 'Cartões' },
  { to: '/backoffice/importacoes', label: 'Importações' },
  { to: '/backoffice/historico', label: 'Histórico Carregamentos' },
  { to: '/backoffice/concessoes', label: 'Concessões' },
];

const validadorNavItems = [
  { to: '/backoffice/validacao', label: 'Validação Prémios' },
];

function roleLabel(role?: string) {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'IMPORTADOR') return 'Importador';
  if (role === 'VALIDADOR') return 'Validador';
  return 'Utilizador';
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { brand } = useBrandStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'IMPORTADOR';
  const isValidador = user?.role === 'VALIDADOR';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside
      className="w-64 text-white flex flex-col h-full shadow-xl flex-shrink-0"
      style={{ backgroundColor: 'var(--brand-primary)' }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/20">
        <div className="text-xl font-bold tracking-tight">Cartões Dá</div>
        <div className="text-xs text-white/60 mt-0.5">{brand.name} Portugal</div>
        <button
          onClick={() => navigate('/driveevents')}
          className="mt-3 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/90 transition-colors"
        >
          ← Menu principal
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Menu Principal
        </p>
        {!isValidador && userNavItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}

        {(isAdmin || isValidador) && (
          <>
            <p className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider mt-5 mb-2">
              BackOffice
            </p>
            {(isValidador ? validadorNavItems : adminNavItems).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/20">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-light)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-white/60 truncate">{roleLabel(user?.role)}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          Terminar Sessão
        </button>
      </div>
    </aside>
  );
}
