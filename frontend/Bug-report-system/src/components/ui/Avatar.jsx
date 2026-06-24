export function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function Avatar({ name, size = 'md', color, className = '' }) {
  const sizes = { sm: 'avatar-sm', md: '', lg: 'avatar-lg' };
  return (
    <div
      className={`avatar ${sizes[size] || ''} ${className}`}
      style={color ? { background: color } : undefined}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
