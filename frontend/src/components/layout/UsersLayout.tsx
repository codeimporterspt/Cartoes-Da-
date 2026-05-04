import { useNavigate } from 'react-router-dom';
import UsersPage from '../../pages/admin/UsersPage';

export default function UsersLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gray-700 text-white px-6 py-4 flex items-center gap-3 shadow-lg flex-shrink-0">
        <button
          onClick={() => navigate('/driveevents')}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          ← Selecionar Marca
        </button>
        <span className="text-white/30">·</span>
        <span className="font-semibold tracking-tight">Gestão de Utilizadores</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <UsersPage />
      </div>
    </div>
  );
}
