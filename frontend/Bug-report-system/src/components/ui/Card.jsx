export default function Card({ children, className = '', hover = false, padding = true, onClick }) {
  return (
    <div
      className={`app-card ${padding ? 'p-6' : ''} ${hover ? 'card-interactive' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      {children}
    </div>
  );
}
