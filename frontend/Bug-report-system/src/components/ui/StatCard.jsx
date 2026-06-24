import Spinner from './Spinner';

export default function StatCard({ label, value, isLoading, accent, icon: Icon, delay = 0, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`stat-card animate-fade-up w-full text-left${onClick ? ' cursor-pointer hover:border-primary/30 transition-colors' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-card-header">
        {Icon && (
          <div className="stat-card-icon" style={accent ? { color: accent } : undefined}>
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <span className="stat-card-label">{label}</span>
      </div>
      {isLoading ? (
        <Spinner size="sm" className="mt-2" />
      ) : (
        <span className="stat-card-value" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
      )}
    </Tag>
  );
}
