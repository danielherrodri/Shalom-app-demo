import type { ReactNode } from 'react';

type FieldProps = {
  htmlFor: string;
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ htmlFor, label, hint, children }: FieldProps) {
  return <div className="shalom-field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <p className="shalom-field-hint">{hint}</p>}
  </div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="shalom-empty">{children}</p>;
}
