interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
  icon?: string;
}

export default function EmptyState({ message, action, icon = '' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {action}
    </div>
  );
}
