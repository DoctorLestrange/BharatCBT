import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface RoughPadModalProps {
  open: boolean;
  onClose: () => void;
  notes: string;
  onChange: (notes: string) => void;
}

export const RoughPadModal: React.FC<RoughPadModalProps> = ({
  open,
  onClose,
  notes,
  onChange,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rough Sheet / Digital Scratchpad"
      maxWidthClass="max-w-xl"
      headerClassName="bg-[#1E1E1E] text-white border-slate-700 dark:bg-neutral-800"
      footer={
        <>
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Sheet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
          >
            Done
          </button>
        </>
      }
    >
      <p className="mb-2 text-xs text-slate-500 dark:text-neutral-400">
        Your rough notes stay saved locally for this exam session.
      </p>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot down equations, seating grids, ratios, or elimination notes here..."
        rows={11}
        className="w-full rounded border border-slate-300 bg-[#FFFDF7] p-3 font-mono text-sm text-slate-900 outline-none focus:border-orange-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-orange-500"
      />
    </Modal>
  );
};
