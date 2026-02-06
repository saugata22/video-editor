export interface EffectParameter {
  name: string
  label: string
  type: 'float' | 'int' | 'boolean' | 'color'
  defaultValue: number | boolean | string
  min?: number
  max?: number
  step?: number
}

export interface Effect {
  id: string
  name: string
  description: string
  category: 'simple' | 'math' | 'ai'
  parameters: EffectParameter[]
  fragmentShader?: string
  enabled: boolean
}

export interface AppliedEffect {
  id: string
  effectId: string
  name: string
  parameters: Record<string, number | boolean | string>
  enabled: boolean
}

export interface EffectState {
  available: Effect[]
  applied: AppliedEffect[]
  selectedEffectId: string | null
}
