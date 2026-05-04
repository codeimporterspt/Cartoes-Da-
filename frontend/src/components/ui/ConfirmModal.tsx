import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'success';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmVariant = 'primary',
  isLoading,
}: ConfirmModalProps) {
  const btnClass = {
    danger: 'btn-danger',
    primary: 'btn-primary',
    success: 'btn-success',
  }[confirmVariant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-ghost btn" onClick={onClose} disabled={isLoading}>
          Cancelar
        </button>
        <button
          className={`btn ${btnClass}`}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'A processar...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
