import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
                  <label className="block text-sm font-semibold text-slate-300 sm:text-xs">

          {label}
          {required && <span className="text-rose-400 mr-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] font-medium text-rose-400 mt-1">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`min-h-11 w-full min-w-0 rounded-xl border bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition-colors duration-200 focus:outline-none sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-xs ${
          error ? 'border-rose-500/80 focus:border-rose-400' : 'border-slate-800 focus:border-cyan-500/80'
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`min-h-11 w-full min-w-0 rounded-xl border bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 transition-colors duration-200 focus:outline-none sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-xs ${
          error ? 'border-rose-500/80 focus:border-rose-400' : 'border-slate-800 focus:border-cyan-500/80'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`min-h-[100px] w-full min-w-0 rounded-xl border bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition-colors duration-200 focus:outline-none sm:min-h-[80px] sm:rounded-lg sm:py-2 sm:text-xs ${
          error ? 'border-rose-500/80 focus:border-rose-400' : 'border-slate-800 focus:border-cyan-500/80'
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
