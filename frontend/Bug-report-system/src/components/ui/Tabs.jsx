export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`tab-bar ${className}`}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`tab-item ${activeTab === id ? 'tab-item-active' : ''}`}
        >
          {Icon && <Icon size={15} strokeWidth={2.25} />}
          {label}
        </button>
      ))}
    </div>
  );
}
