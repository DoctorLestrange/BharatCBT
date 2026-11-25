import React from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              variant === 'danger'
                ? 'rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700'
                : 'rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700'
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-slate-700 dark:text-neutral-200">{message}</div>
    </Modal>
  );
};
