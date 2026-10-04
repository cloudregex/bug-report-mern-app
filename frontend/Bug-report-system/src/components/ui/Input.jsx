import React from 'react';

export function FieldLabel({ children, optional, required, htmlFor, id }) {
  return (
    <label htmlFor={htmlFor || id} className="field-label">
      {children}
      {required && <span className="field-label-required" aria-hidden="true">*</span>}
      {optional && <span className="field-label-optional">(optional)</span>}
    </label>
  );
}

export function Input({
  label,
  optional,
  required,
  id,
  name,
  className = '',
  error,
  helperText,
  ...props
}) {
  const inputId = id || name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full">
      {label && (
        <FieldLabel htmlFor={inputId} optional={optional} required={required}>
          {label}
        </FieldLabel>
      )}
      <input
        id={inputId}
        name={name || inputId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`field-input ${error ? 'field-input-error' : ''} ${className}`}
        {...props}
      />
      {error ? (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="text-xs text-muted-foreground mt-1.5 block pl-0.5">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  optional,
  required,
  id,
  name,
  className = '',
  rows = 3,
  error,
  helperText,
  ...props
}) {
  const inputId = id || name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full">
      {label && (
        <FieldLabel htmlFor={inputId} optional={optional} required={required}>
          {label}
        </FieldLabel>
      )}
      <textarea
        id={inputId}
        name={name || inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`field-input field-textarea ${error ? 'field-input-error' : ''} ${className}`}
        {...props}
      />
      {error ? (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="text-xs text-muted-foreground mt-1.5 block pl-0.5">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  optional,
  required,
  id,
  name,
  className = '',
  children,
  error,
  helperText,
  ...props
}) {
  const inputId = id || name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full">
      {label && (
        <FieldLabel htmlFor={inputId} optional={optional} required={required}>
          {label}
        </FieldLabel>
      )}
      <select
        id={inputId}
        name={name || inputId}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`field-input field-select ${error ? 'field-input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="text-xs text-muted-foreground mt-1.5 block pl-0.5">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
