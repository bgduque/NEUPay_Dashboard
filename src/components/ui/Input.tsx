import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute inset-y-0 left-3 flex items-center text-text-tertiary pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input-base',
            leftIcon && 'pl-10',
            rightSlot && 'pr-10',
            error && 'border-rose-500 focus:ring-rose-500',
            className,
          )}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
});

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, hint, options, className, id, ...rest }: SelectProps) {
  const fallbackId = useId();
  const selectId = id ?? fallbackId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn('input-base appearance-none pr-10', className)}
        {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}
