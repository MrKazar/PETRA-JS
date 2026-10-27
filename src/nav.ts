import { createContext, useContext } from 'react'

export type Tab = 'home' | 'plan' | 'programs' | 'routines' | 'profile'

export type Route =
  | { name: Tab }
  | { name: 'program'; id: string }
  | { name: 'workout' }
  | { name: 'history' }
  | { name: 'session'; id: string }
  | { name: 'records' }

export interface Nav {
  route: Route
  push: (r: Route) => void
  pop: () => void
  /** Remplace la pile entière (changement d'onglet). */
  reset: (r: Route) => void
  replace: (r: Route) => void
}

export const NavContext = createContext<Nav>(null as unknown as Nav)
export const useNav = () => useContext(NavContext)
