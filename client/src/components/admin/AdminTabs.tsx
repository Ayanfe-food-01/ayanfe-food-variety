interface AdminTabsProps {
  ariaLabel: string
  tabs: Array<{ key: string; label: string }>
  activeKey: string
  onSelect: (key: string) => void
}

export function AdminTabs({ ariaLabel, tabs, activeKey, onSelect }: AdminTabsProps) {
  return (
    <div
      className="admin-tabs"
      role="tablist"
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <button
          className={`admin-tab${activeKey === tab.key ? ' admin-tab-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeKey === tab.key}
          key={tab.key}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}