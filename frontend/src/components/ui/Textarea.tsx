import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, rows = 4, ...props }, ref) => {
    const textareaClasses =
      'w-full px-4 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y';

    const errorClasses = error
      ? 'border-error focus:ring-error'
      : '';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`${textareaClasses} ${errorClasses} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
