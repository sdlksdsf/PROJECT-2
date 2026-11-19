import type { ReactNode } from 'react';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
  );
}

export function Row({
  title,
  description,
  control,
  icon,
  id
}: {
  title: string;
  description?: string;
  control?: ReactNode;
  icon?: ReactNode;
  id?: string;
}) {
  return (
    <div className="row" id={id}>
      {icon && <span style={{ color: 'var(--text-dim)', display: 'grid', placeItems: 'center' }}>{icon}</span>}
      <div className="row-text">
        <div className="row-label">{title}</div>
        {description && <div className="row-desc">{description}</div>}
      </div>
      {control && <div className="row-control">{control}</div>}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  id
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="section" id={id}>
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
      <div className="card">{children}</div>
    </section>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <select className="select" value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: 150, accentColor: 'var(--accent)' }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 44, textAlign: 'right' }}>
        {value}
        {suffix ?? ''}
      </span>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}
