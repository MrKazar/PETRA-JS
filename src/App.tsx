import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { NavContext, type Nav, type Route, type Tab } from './nav'
import { useData } from './data/store'
import { ToastHost } from './ui/kit'
import { IconCalendar, IconCheckList, IconDumbbell, IconHome, IconUser } from './ui/icons'
import { HomeScreen } from './screens/Home'
import { PlanScreen } from './screens/Plan'
import { ProgramsScreen } from './screens/Programs'
import { ProgramDetailScreen } from './screens/ProgramDetail'
import { RoutinesScreen } from './screens/Routines'
import { ProfileScreen } from './screens/Profile'
import { WorkoutScreen } from './screens/Workout'
import { HistoryScreen, SessionDetailScreen } from './screens/History'
import { RecordsScreen } from './screens/Records'
import { formatClock } from './logic/util'
import { useNow } from './ui/useNow'

const TABS: { tab: Tab; label: string; Icon: typeof IconHome }[] = [
  { tab: 'home', label: 'Accueil', Icon: IconHome },
  { tab: 'plan', label: 'Plan', Icon: IconCalendar },
  { tab: 'programs', label: 'Programmes', Icon: IconDumbbell },
  { tab: 'routines', label: 'Routines', Icon: IconCheckList },
  { tab: 'profile', label: 'Profil', Icon: IconUser },
]

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }])
  const stackRef = useRef(stack)
  useEffect(() => {
    stackRef.current = stack
  }, [stack])
  const data = useData()

  const nav: Nav = useMemo(
    () => ({
      route: stack[stack.length - 1],
      push: (r) => setStack((s) => [...s, r]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      reset: (r) => setStack([r]),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    }),
    [stack],
  )

  const handleBack = useCallback(() => {
    const ev = new Event('petra:back', { cancelable: true })
    window.dispatchEvent(ev)
    if (ev.defaultPrevented) return
    const s = stackRef.current
    if (s.length > 1) setStack(s.slice(0, -1))
    else if (s[0].name !== 'home') setStack([{ name: 'home' }])
    else if (Capacitor.isNativePlatform()) CapApp.minimizeApp()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', handleBack)
    return () => {
      sub.then((h) => h.remove())
    }
  }, [handleBack])

  const route = nav.route
  const rootTab: Tab = (stack[0].name as Tab) ?? 'home'
  const showTabs = route.name !== 'workout'

  return (
    <NavContext.Provider value={nav}>
      <div className="app">
        <Screen route={route} key={JSON.stringify(route)} />
        {data.active && route.name !== 'workout' && <LiveBanner name={data.active.programName} startedAt={data.active.startedAt} restEnd={data.active.rest?.endsAt} onOpen={() => nav.push({ name: 'workout' })} />}
        {showTabs && (
          <nav className="tabbar">
            {TABS.map(({ tab, label, Icon }) => (
              <button key={tab} className={`tab${rootTab === tab ? ' on' : ''}`} onClick={() => nav.reset({ name: tab })}>
                <span className="pill">
                  <Icon />
                </span>
                {label}
              </button>
            ))}
          </nav>
        )}
        <ToastHost />
      </div>
    </NavContext.Provider>
  )
}

function LiveBanner({ name, startedAt, restEnd, onOpen }: { name: string; startedAt: number; restEnd?: number; onOpen: () => void }) {
  const now = useNow(1000)
  const resting = restEnd != null && restEnd > now
  return (
    <div className="live-banner" onClick={onOpen}>
      <span className="dot" />
      <span className="grow ellipsis">{name}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{resting ? `Repos ${formatClock((restEnd - now) / 1000)}` : formatClock((now - startedAt) / 1000)}</span>
    </div>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />
    case 'plan':
      return <PlanScreen />
    case 'programs':
      return <ProgramsScreen />
    case 'program':
      return <ProgramDetailScreen id={route.id} />
    case 'routines':
      return <RoutinesScreen />
    case 'profile':
      return <ProfileScreen />
    case 'workout':
      return <WorkoutScreen />
    case 'history':
      return <HistoryScreen />
    case 'session':
      return <SessionDetailScreen id={route.id} />
    case 'records':
      return <RecordsScreen />
  }
}
