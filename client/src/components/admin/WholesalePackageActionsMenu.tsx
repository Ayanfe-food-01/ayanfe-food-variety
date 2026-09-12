import { ActionMenu, ActionMenuButton } from './ActionMenu'

interface WholesalePackageActionsMenuProps {
  pkg: { name: string; isActive: boolean }
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onRemove: () => void
}

export function WholesalePackageActionsMenu({
  pkg,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDuplicate,
  onToggleActive,
  onRemove,
}: WholesalePackageActionsMenuProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${pkg.name}`} fixedPosition triggerVariant="plain" triggerOrientation="vertical">
      {(close) => (
        <>
          {canMoveUp && <ActionMenuButton onClick={() => { close(); onMoveUp() }}>Move up</ActionMenuButton>}
          {canMoveDown && <ActionMenuButton onClick={() => { close(); onMoveDown() }}>Move down</ActionMenuButton>}
          <ActionMenuButton onClick={() => { close(); onEdit() }}>Edit</ActionMenuButton>
          <ActionMenuButton onClick={() => { close(); onDuplicate() }}>Duplicate</ActionMenuButton>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleActive() }}>{pkg.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onRemove() }}>Remove</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}