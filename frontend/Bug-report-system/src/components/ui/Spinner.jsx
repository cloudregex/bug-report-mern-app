export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'spinner-sm', md: '', lg: 'spinner-lg' };
  return (
    <div className={`spinner ${sizes[size] || ''} ${className}`} role="status" aria-label="Loading" />
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="page-loader">
      <Spinner size="lg" />
      {message && <p className="page-loader-text">{message}</p>}
    </div>
  );
}
