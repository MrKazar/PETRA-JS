import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { NavContext, type Nav, type Route, type Tab } from './nav'
import { useData } from './data/store'
import { ToastHost } from './ui/kit'
import { IconBook, IconDumbbell, IconFlame, IconSettings, IconToday } from './ui/icons'
import { TodayScreen } from './screens/Today'
import { ProgramsScreen } from './screens/Programs'
import { ProgramDetailScreen } from './screens/ProgramDetail'
import { RoutinesScreen } from './screens/Routines'
import { ExercisesScreen } from './screens/Exercises'
import { FinishersScreen } from './screens/Finishers'
import { SettingsScreen } from './screens/Settings'
import { WorkoutScreen } from './screens/Workout'
import { HistoryScreen, SessionDetailScreen } from './screens/History'
import { RecordsScreen } from './screens/Records'
import { formatClock } from './logic/util'
import { useNow } from './ui/useNow'
import { checkOnLaunch } from './logic/updates'
import { applyTheme } from './ui/theme'

const TABS: { tab: Tab; label: string; Icon: typeof IconToday }[] = [
  { tab: 'today', label: 'Aujourd’hui', Icon: IconToday },
  { tab: 'programs', label: 'Programmes', Icon: IconDumbbell },
  { tab: 'exercises', label: 'Exercices', Icon: IconBook },
  { tab: 'finishers', label: 'Finishers', Icon: IconFlame },
  { tab: 'settings', label: 'Paramètres', Icon: IconSettings },
]

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'today' }])
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
    else if (s[0].name !== 'today') setStack([{ name: 'today' }])
    else if (Capacitor.isNativePlatform()) CapApp.minimizeApp()
  }, [])

  useEffect(() => {
    if (Capacitor.isNativePlatform()) checkOnLaunch()
  }, [])

  useEffect(() => applyTheme(data.settings.theme), [data.settings.theme])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', handleBack)
    return () => {
      sub.then((h) => h.remove())
    }
  }, [handleBack])

  const route = nav.route
  const rootTab = stack[0].name as Tab
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
    case 'today':
      return <TodayScreen />
    case 'programs':
      return <ProgramsScreen />
    case 'program':
      return <ProgramDetailScreen id={route.id} />
    case 'exercises':
      return <ExercisesScreen />
    case 'finishers':
      return <FinishersScreen />
    case 'settings':
      return <SettingsScreen />
    case 'routines':
      return <RoutinesScreen />
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
