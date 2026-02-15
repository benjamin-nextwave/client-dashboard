export type UserRole = 'operator' | 'client'

export interface JWTClaims {
  user_role: UserRole
  client_id: string | null
  sub: string
}

export interface UserProfile {
  id: string
  user_role: UserRole
  client_id: string | null
  display_name: string | null
}
