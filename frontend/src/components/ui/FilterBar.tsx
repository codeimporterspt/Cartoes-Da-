interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export default function FilterBar({ children, onReset }: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
      <div className="flex flex-wrap gap-3 items-end">
        {children}
        {onReset && (
          <button className="btn-ghost btn btn-sm" onClick={onReset}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
