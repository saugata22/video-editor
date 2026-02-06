import React from 'react'
import { availableEffects } from '../../effects/effectRegistry'

interface EffectsPanelProps {
  onApplyEffect: (effectId: string) => void
  appliedEffects: Array<{ id: string; effectId: string; name: string; parameters: Record<string, any> }>
  onRemoveEffect: (id: string) => void
  onUpdateParameter: (effectInstanceId: string, paramName: string, value: number) => void
  onToggleEffect: (effectInstanceId: string) => void
}

const EffectsPanel: React.FC<EffectsPanelProps> = ({
  onApplyEffect,
  appliedEffects,
  onRemoveEffect,
  onUpdateParameter,
  onToggleEffect,
}) => {
  return (
    <div className="effects-panel">
      <h2 className="panel-title">Effects</h2>

      <div className="effects-browser">
        <h3 className="section-title">Available Effects</h3>
        <div className="effects-grid">
          {availableEffects.map((effect) => (
            <div
              key={effect.id}
              className="effect-card"
              onClick={() => onApplyEffect(effect.id)}
            >
              <div className="effect-name">{effect.name}</div>
              <div className="effect-description">{effect.description}</div>
            </div>
          ))}
        </div>
      </div>

      {appliedEffects.length > 0 && (
        <div className="effects-stack">
          <h3 className="section-title">Applied Effects ({appliedEffects.length})</h3>
          <div className="applied-effects-list">
            {appliedEffects.map((appliedEffect) => {
              const effectDef = availableEffects.find((e) => e.id === appliedEffect.effectId)
              if (!effectDef) return null

              return (
                <div key={appliedEffect.id} className="applied-effect">
                  <div className="applied-effect-header">
                    <span className="applied-effect-name">{appliedEffect.name}</span>
                    <div className="applied-effect-actions">
                      <button
                        onClick={() => onToggleEffect(appliedEffect.id)}
                        className="toggle-btn"
                        title="Toggle effect"
                      >
                        {appliedEffect.parameters['enabled'] !== false ? '👁' : '👁‍🗨'}
                      </button>
                      <button
                        onClick={() => onRemoveEffect(appliedEffect.id)}
                        className="remove-btn"
                        title="Remove effect"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="effect-parameters">
                    {effectDef.parameters.map((param) => (
                      <div key={param.name} className="parameter">
                        <label className="parameter-label">
                          {param.label}
                          <span className="parameter-value">
                            {(appliedEffect.parameters[param.name] || param.defaultValue).toFixed(1)}
                          </span>
                        </label>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={appliedEffect.parameters[param.name] || param.defaultValue}
                          onChange={(e) =>
                            onUpdateParameter(appliedEffect.id, param.name, parseFloat(e.target.value))
                          }
                          className="parameter-slider"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default EffectsPanel
