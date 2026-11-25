import React, { useEffect, useState } from 'react';
import { Calculator, Delete, X } from 'lucide-react';
import {
  evaluateCalculatorExpression,
  formatCalculatorResult,
} from '../../utils/calculator';

interface CalculatorWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({ open, onClose }) => {
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState<string>('0');
  const [degMode, setDegMode] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const append = (token: string) => {
    setDisplay((prev) => prev + token);
  };

  const handleEvaluate = () => {
    if (!display.trim()) {
      setResult('0');
      return;
    }
    try {
      const val = evaluateCalculatorExpression(display, degMode ? 'DEG' : 'RAD');
      setResult(formatCalculatorResult(val));
    } catch {
      setResult('Error');
    }
  };

  const handleClear = () => {
    setDisplay('');
    setResult('0');
  };

  const handleBackspace = () => {
    setDisplay((prev) => prev.slice(0, -1));
  };

  const buttons = [
    ['sin(', 'cos(', 'tan(', 'log2('],
    ['log(', 'ln(', 'sqrt(', '^'],
    ['(', ')', 'π', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', 'e', '='],
  ];

  return (
    <div
      role="dialog"
      aria-label="Scientific Calculator"
      className="fixed right-4 bottom-20 z-40 w-72 overflow-hidden rounded-lg border border-neutral-600 bg-[#222222] text-white shadow-2xl dark:border-neutral-700"
    >
      <div className="flex items-center justify-between bg-[#1E1E1E] px-3 py-2 dark:bg-neutral-900">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Calculator className="h-3.5 w-3.5 text-orange-400" />
          <span>Scientific Calculator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDegMode((d) => !d)}
            aria-label={`Angle mode: ${degMode ? 'Degrees' : 'Radians'}`}
            className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-neutral-600"
          >
            {degMode ? 'DEG' : 'RAD'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-neutral-300 hover:bg-neutral-700 hover:text-white"
            aria-label="Close calculator"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-neutral-950 px-3 py-2.5 text-right font-mono">
        <input
          type="text"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEvaluate();
            }
          }}
          placeholder="0"
          aria-label="Calculator expression"
          className="w-full bg-transparent text-right text-xs text-neutral-300 outline-none"
        />
        <div data-testid="calculator-result" className="mt-1 truncate text-xl font-bold text-emerald-400">
          {result}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 bg-neutral-800 p-2">
        <button
          type="button"
          onClick={handleClear}
          className="col-span-2 rounded bg-rose-600 py-1.5 text-xs font-bold hover:bg-rose-500"
        >
          AC
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="col-span-2 flex items-center justify-center gap-1 rounded bg-neutral-600 py-1.5 text-xs font-bold hover:bg-neutral-500"
        >
          <Delete className="h-3.5 w-3.5" /> Back
        </button>

        {buttons.flat().map((btn) => {
          const isEq = btn === '=';
          const isOp = ['÷', '×', '-', '+', '^'].includes(btn);
          return (
            <button
              key={btn}
              type="button"
              onClick={() => (isEq ? handleEvaluate() : append(btn))}
              className={`rounded py-1.5 text-xs font-semibold transition ${
                isEq
                  ? 'bg-emerald-600 font-bold text-white hover:bg-emerald-500'
                  : isOp
                    ? 'bg-orange-600 text-white hover:bg-orange-500'
                    : 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
              }`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
