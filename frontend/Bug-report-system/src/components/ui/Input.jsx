export function FieldLabel({ children, optional }) {
  return (
    <label className="field-label">
      {children}
      {optional && <span className="field-label-optional">(optional)</span>}
    </label>
  );
}

export function Input({ label, optional, id, className = '', ...props }) {
  return (
    <div>
      {label && <FieldLabel optional={optional}>{label}</FieldLabel>}
      <input id={id} className={`field-input ${className}`} {...props} />
    </div>
  );
}

export function Textarea({ label, optional, id, className = '', rows = 3, ...props }) {
  return (
    <div>
      {label && <FieldLabel optional={optional}>{label}</FieldLabel>}
      <textarea id={id} rows={rows} className={`field-input field-textarea ${className}`} {...props} />
    </div>
  );
}

export function Select({ label, optional, id, className = '', children, ...props }) {
  return (
    <div>
      {label && <FieldLabel optional={optional}>{label}</FieldLabel>}
      <select id={id} className={`field-input field-select ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}
