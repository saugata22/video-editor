import React from 'react'
import EffectsPanel from '../effects/EffectsPanel'

interface RightPanelProps {
  onApplyEffect: (effectId: string) => void
  appliedEffects: Array<{ id: string; effectId: string; name: string; parameters: Record<string, any> }>
  onRemoveEffect: (id: string) => void
  onUpdateParameter: (effectInstanceId: string, paramName: string, value: number) => void
  onToggleEffect: (effectInstanceId: string) => void
}

const RightPanel: React.FC<RightPanelProps> = (props) => {
  return (
    <div className="right-panel">
      <EffectsPanel {...props} />
    </div>
  )
}

export default RightPanel
