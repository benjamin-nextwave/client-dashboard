// Vooringestelde kleuren voor labels en notities. UI gebruikt dit, DB
// accepteert vrije tekst (geen check-constraint) zodat we later kunnen
// uitbreiden.
export const COLOR_PALETTE = [
  { value: '#ef4444', name: 'Rood' },
  { value: '#f59e0b', name: 'Oranje' },
  { value: '#eab308', name: 'Geel' },
  { value: '#10b981', name: 'Groen' },
  { value: '#06b6d4', name: 'Cyaan' },
  { value: '#3b82f6', name: 'Blauw' },
  { value: '#8b5cf6', name: 'Paars' },
  { value: '#6b7280', name: 'Grijs' },
] as const

export const DEFAULT_COLOR = COLOR_PALETTE[5].value
