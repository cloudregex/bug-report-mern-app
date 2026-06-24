export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  loading = false,
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    pill: 'btn-pill',
    outline: 'btn-outline',
  };

  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    auto: 'btn-auto',
  };

  const base = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || '';

  return (
    <button className={`${base} ${sizeClass} ${className}`.trim()} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <>
          <span className="spinner spinner-sm spinner-inverted" />
          {children}
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.25} />}
          {children}
        </>
      )}
    </button>
  );
}
