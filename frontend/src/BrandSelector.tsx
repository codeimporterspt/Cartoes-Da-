import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BRAND_CONFIGS } from './config/brandConfig';
import { useBrandStore } from './store/brandStore';
import { useAuthStore } from './store/authStore';
import { authApi, usersApi } from './services/api';

/* ─── Types ─────────────────────────────────────────────── */
export interface Brand {
  name: string;
  slug: string;
  logoUrl?: string;   // official SVG/PNG URL
  logoNode?: React.ReactNode; // fallback rendered node
}

/* ─── Logo URLs — official Portuguese brand sites ───────── */
const LOGO_URLS: Record<string, string> = {
  byd:      'https://www.byd.com/static_material/byd/overseas/public-icon/logo.svg',
  dongfeng: 'https://stwfccmsprodwesteurope01.blob.core.windows.net/dongfengpt-682326be8578fb1e857c7d06-prod/group-1-1728991209557.webp',
  farizon:  'https://stwfccmsprodwesteurope01.blob.core.windows.net/farizonportugal-67ae21636c77866a338706f5-prod/logowhite1739444918335_1739804607257.webp',
  geely:    'https://upload.wikimedia.org/wikipedia/commons/2/2c/Geely_Logo_2022.svg',
  honda:    'https://honda-automoveis.pt/www/assets/default/images/generic/logo_honda.svg',
  hyundai:  'https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg',
  nissan:   'https://libs-europe.nissan-cdn.net/etc/designs/pace-omni-nav/ui-build/assets/images/nissan-next-logo-text.svg',
  xpeng:    'https://a-cdn.xpeng.com//website/_next/static/media/logo-white.be6f83f5.svg',
  zeekr:    'https://upload.wikimedia.org/wikipedia/commons/1/1e/Zeekr_logo.svg',
};

/* ─── Logo image component with text fallback ───────────── */
function BrandLogoImg({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const src = LOGO_URLS[slug];

  if (!src || failed) {
    return (
      <span style={{
        fontFamily: "'Rajdhani', Arial, sans-serif",
        fontWeight: 700,
        fontSize: '1.5rem',
        letterSpacing: '0.14em',
        color: 'white',
        textTransform: 'uppercase',
      }}>
        {name}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        maxWidth: '130px',
        maxHeight: '56px',
        objectFit: 'contain',
        /* Convert any logo to white silhouette on dark bg */
        filter: 'brightness(0) invert(1)',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── Default brand list ─────────────────────────────────── */
const DEFAULT_BRANDS: Brand[] = [
  { name: 'BYD',      slug: 'byd'      },
  { name: 'Dongfeng', slug: 'dongfeng' },
  { name: 'Farizon',  slug: 'farizon'  }, // no official SVG available
  { name: 'Geely',    slug: 'geely'    },
  { name: 'Honda',    slug: 'honda'    },
  { name: 'Hyundai',  slug: 'hyundai'  },
  { name: 'Nissan',   slug: 'nissan'   },
  { name: 'Xpeng',    slug: 'xpeng'    },
  { name: 'Zeekr',    slug: 'zeekr'    },
];

/* ─── Main component ─────────────────────────────────────── */
export interface BrandSelectorProps {
  brands?: Brand[];
}

export default function BrandSelector({ brands = DEFAULT_BRANDS }: BrandSelectorProps) {
  const navigate = useNavigate();
  const { setBrand } = useBrandStore();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'IMPORTADOR';

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['users', 'PENDING', 'brand-selector'],
    queryFn: () => usersApi.list({ hasPendingBrands: 'true' }).then(r => r.data as { id: string }[]),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });
  const pendingCount = pendingUsers.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleChangePassword() {
    if (pwdForm.next !== pwdForm.confirm) {
      toast.error('As passwords não coincidem');
      return;
    }
    if (!pwdForm.next) {
      toast.error('Introduza a nova password');
      return;
    }
    setPwdLoading(true);
    try {
      await authApi.changePassword(pwdForm.current, pwdForm.next);
      toast.success('Password alterada com sucesso');
      setShowPwdModal(false);
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('Password atual incorreta');
    } finally {
      setPwdLoading(false);
    }
  }

  function canAccess(slug: string) {
    if (user?.role === 'ADMIN') return true;
    if (user?.brands?.includes(slug)) return true;
    return user?.concessao?.brand === slug;
  }

  function selectBrand(slug: string) {
    const config = BRAND_CONFIGS[slug];
    if (config) setBrand(config);
    navigate(user?.role === 'VALIDADOR' ? '/backoffice/validacao' : '/premios');
  }

  /* Inject Google Fonts once */
  useEffect(() => {
    if (document.getElementById('de-fonts')) return;
    const link = document.createElement('link');
    link.id = 'de-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <style>{`
        @keyframes de-card-in {
          from { opacity: 0; transform: translateY(22px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes de-header-in {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0);     }
        }

        .de-root {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 56px 24px 72px;
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,.35) 0%, transparent 70%),
            linear-gradient(160deg, #13132a 0%, #0d0d1d 45%, #090910 100%);
          font-family: 'Rajdhani', 'Segoe UI', sans-serif;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .de-header {
          text-align: center;
          margin-bottom: 36px;
          animation: de-header-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        .de-title {
          font-family: 'Orbitron', 'Segoe UI', sans-serif;
          font-size: clamp(2rem, 5.5vw, 3.4rem);
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.04em;
          margin: 0;
          line-height: 1;
          text-shadow: 0 0 40px rgba(99,102,241,.5), 0 0 80px rgba(99,102,241,.2);
        }

        .de-subtitle {
          margin-top: 12px;
          color: rgba(255,255,255,.38);
          font-size: 0.85rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .de-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 28px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Rajdhani', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          color: #fff;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .de-btn:active { transform: translateY(0); }

        .de-btn--admin {
          background: rgba(120,120,130,.3);
          border: 1px solid rgba(160,160,170,.35);
          color: rgba(220,220,225,.85);
          box-shadow: none;
        }
        .de-btn--admin:hover {
          transform: translateY(-2px);
          background: rgba(140,140,150,.4);
          border-color: rgba(180,180,190,.5);
          color: #fff;
        }

        .de-btn--logout {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.15);
          box-shadow: none;
        }
        .de-btn--logout:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.3);
        }

        .de-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          width: 100%;
          max-width: 940px;
        }
        @media (max-width: 740px) {
          .de-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        .de-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 128px;
          border-radius: 18px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          backdrop-filter: blur(6px);
          cursor: pointer;
          overflow: hidden;
          opacity: 0;
          animation: de-card-in 0.55s cubic-bezier(0.22,1,0.36,1) both;
          transition:
            transform  .28s cubic-bezier(0.22,1,0.36,1),
            box-shadow .28s ease,
            border-color .28s ease,
            background .28s ease;
        }
        .de-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(160deg, rgba(255,255,255,.07) 0%, transparent 55%);
          pointer-events: none;
        }
        .de-card:hover {
          transform: scale(1.055) translateY(-3px);
          background: rgba(255,255,255,.07);
          border-color: rgba(99,102,241,.55);
          box-shadow:
            0 0 0 1px rgba(99,102,241,.4),
            0 12px 40px rgba(99,102,241,.3),
            0 2px 12px rgba(0,0,0,.4);
        }
        .de-card:active { transform: scale(1.02) translateY(-1px); }



        .de-user-btn {
          position: absolute;
          top: 20px;
          right: 24px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border: 2px solid rgba(255,255,255,.2);
          color: white;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow .2s ease, transform .2s ease;
          animation: de-header-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
          z-index: 10;
        }
        .de-user-btn:hover {
          box-shadow: 0 0 0 4px rgba(99,102,241,.3);
          transform: scale(1.06);
        }

        .de-user-dropdown {
          position: absolute;
          top: 70px;
          right: 24px;
          width: 220px;
          background: rgba(20,20,40,.95);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 14px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 40px rgba(0,0,0,.5);
          padding: 16px;
          z-index: 20;
          animation: de-card-in 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        .de-user-dropdown-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: rgba(255,255,255,.9);
          margin-bottom: 2px;
        }
        .de-user-dropdown-role {
          font-size: 0.72rem;
          color: rgba(255,255,255,.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .de-user-dropdown-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,.1);
          margin-bottom: 10px;
        }
        .de-user-dropdown-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,.65);
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background .15s, color .15s;
        }
        .de-user-dropdown-item:hover {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.95);
        }

        .de-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .de-modal-card {
          background: #1a1a35;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 28px 32px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,.6);
          animation: de-card-in 0.25s cubic-bezier(0.22,1,0.36,1) both;
        }
        .de-modal-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 20px;
        }
        .de-modal-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255,255,255,.45);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .de-modal-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: #fff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.95rem;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 14px;
          transition: border-color .2s;
        }
        .de-modal-input:focus {
          border-color: rgba(99,102,241,.6);
        }
        .de-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }
        .de-modal-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: none;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity .2s;
        }
        .de-modal-btn:disabled { opacity: .5; cursor: not-allowed; }
        .de-modal-btn--confirm {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #fff;
        }
        .de-modal-btn--cancel {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.65);
          border: 1px solid rgba(255,255,255,.12);
        }

        .de-footer {
          margin-top: 64px;
          color: rgba(255,255,255,.18);
          font-size: 0.75rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          animation: de-header-in 1s 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
      `}</style>

      <div className="de-root">
        {/* User widget */}
        <div ref={menuRef}>
          <button className="de-user-btn" onClick={() => setShowUserMenu(v => !v)}>
            {user?.name?.charAt(0).toUpperCase()}
          </button>
          {showUserMenu && (
            <div className="de-user-dropdown">
              <div className="de-user-dropdown-name">{user?.name}</div>
              <div className="de-user-dropdown-role">
                {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'IMPORTADOR' ? 'Importador' : 'Utilizador'}
              </div>
              <hr className="de-user-dropdown-divider" />
              <button
                className="de-user-dropdown-item"
                onClick={() => { setShowUserMenu(false); setShowPwdModal(true); }}
              >
                Alterar Password
              </button>
            </div>
          )}
        </div>

        {/* Header */}
        <header className="de-header">
          <h1 className="de-title">Cartões Dá</h1>
          <p className="de-subtitle">Selecione a marca para aceder</p>
        </header>

        {/* Brand grid */}
        <div className="de-grid">
          {brands.filter(brand => canAccess(brand.slug)).map((brand, i) => (
            <div
              key={brand.slug}
              className="de-card"
              style={{ animationDelay: `${120 + i * 65}ms` }}
              onClick={() => selectBrand(brand.slug)}
              role="button"
              tabIndex={0}
              aria-label={`Aceder à área ${brand.name}`}
              onKeyDown={e => e.key === 'Enter' && selectBrand(brand.slug)}
            >
              {brand.logoNode ?? <BrandLogoImg slug={brand.slug} name={brand.name} />}
            </div>
          ))}
        </div>

        {/* Botões + footer — fixos no fundo centrados */}
        <div style={{ position: 'fixed', bottom: 'calc(24px + 2cm)', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {isAdmin && (
              <button
                className="de-btn de-btn--admin"
                onClick={() => navigate('/utilizadores')}
                style={{ position: 'relative' }}
              >
                Gestão de Utilizadores
                {pendingCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '10px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
            <button
              className="de-btn de-btn--logout"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Terminar Sessão
            </button>
          </div>
          <footer className="de-footer" style={{ margin: 0, marginTop: '1cm' }}>
            © {new Date().getFullYear()} Cartões Dá — Caetano Automotive Portugal - Distribution
          </footer>
        </div>
      </div>
      {/* Change password modal */}
      {showPwdModal && (
        <div className="de-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPwdModal(false); }}>
          <div className="de-modal-card">
            <div className="de-modal-title">Alterar Password</div>
            <label className="de-modal-label">Password atual</label>
            <input
              type="password"
              className="de-modal-input"
              value={pwdForm.current}
              onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
              placeholder="••••••••"
            />
            <label className="de-modal-label">Nova password</label>
            <input
              type="password"
              className="de-modal-input"
              value={pwdForm.next}
              onChange={e => setPwdForm(f => ({ ...f, next: e.target.value }))}
              placeholder="••••••••"
            />
            <label className="de-modal-label">Confirmar nova password</label>
            <input
              type="password"
              className="de-modal-input"
              value={pwdForm.confirm}
              onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
            />
            <div className="de-modal-actions">
              <button
                className="de-modal-btn de-modal-btn--cancel"
                onClick={() => { setShowPwdModal(false); setPwdForm({ current: '', next: '', confirm: '' }); }}
                disabled={pwdLoading}
              >
                Cancelar
              </button>
              <button
                className="de-modal-btn de-modal-btn--confirm"
                onClick={handleChangePassword}
                disabled={pwdLoading}
              >
                {pwdLoading ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
