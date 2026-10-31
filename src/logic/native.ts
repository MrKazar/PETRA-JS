import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { KeepAwake } from '@capacitor-community/keep-awake'

const native = Capacitor.isNativePlatform()

const REST_ID = 1001
const ONGOING_ID = 1002
let permissionAsked = false

async function ensurePermission(): Promise<boolean> {
  if (!native) return false
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return true
    if (permissionAsked) return false
    permissionAsked = true
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted'
  } catch {
    return false
  }
}

let channelReady = false
async function ensureChannels() {
  if (channelReady || Capacitor.getPlatform() !== 'android') return
  channelReady = true
  try {
    await LocalNotifications.createChannel({
      id: 'repos',
      name: 'Fin du repos',
      description: 'Prévient quand le temps de repos est écoulé',
      importance: 5,
      vibration: true,
      visibility: 1,
    })
    await LocalNotifications.createChannel({
      id: 'rappels',
      name: 'Rappels',
      description: 'Rappel de séance et tâches à heure fixe',
      importance: 4,
      vibration: true,
      visibility: 1,
    })
    await LocalNotifications.createChannel({
      id: 'seance',
      name: 'Séance en cours',
      description: 'Affiche la séance en cours',
      importance: 2,
      vibration: false,
      visibility: 1,
    })
  } catch {
    channelReady = false
  }
}

/** Programme la notification de fin de repos (elle sonne même appli en arrière-plan). */
export async function scheduleRestEnd(at: number, body: string) {
  if (!(await ensurePermission())) return
  await ensureChannels()
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] })
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_ID,
          title: 'Repos terminé',
          body,
          channelId: 'repos',
          schedule: { at: new Date(at), allowWhileIdle: true },
        },
      ],
    })
  } catch {
    // pas de notification : le minuteur à l'écran reste la référence
  }
}

export async function cancelRestEnd() {
  if (!native) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] })
  } catch {
    /* rien */
  }
}

const INTERVAL_BASE = 2000
const INTERVAL_MAX = 60
let intervalCount = 0

/** Une notification à chaque changement d'étape du minuteur : il guide aussi écran verrouillé. */
export async function scheduleIntervals(items: { at: number; title: string; body: string }[]) {
  await cancelIntervals()
  const future = items.filter((x) => x.at > Date.now() + 500).slice(0, INTERVAL_MAX)
  if (!future.length || !(await ensurePermission())) return
  await ensureChannels()
  try {
    await LocalNotifications.schedule({
      notifications: future.map((x, i) => ({
        id: INTERVAL_BASE + i,
        title: x.title,
        body: x.body,
        channelId: 'repos',
        schedule: { at: new Date(x.at), allowWhileIdle: true },
      })),
    })
    intervalCount = future.length
  } catch {
    /* le minuteur à l'écran reste la référence */
  }
}

export async function cancelIntervals() {
  if (!native || !intervalCount) return
  const n = intervalCount
  intervalCount = 0
  try {
    await LocalNotifications.cancel({ notifications: Array.from({ length: n }, (_, i) => ({ id: INTERVAL_BASE + i })) })
  } catch {
    /* rien */
  }
}

let audio: AudioContext | undefined
/** Bip court (décompte) ou long (changement d'étape), comme une appli HIIT. */
export function beep(long = false) {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = long ? 1320 : 880
    const t = audio.currentTime
    const d = long ? 0.45 : 0.15
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(audio.destination)
    o.start(t)
    o.stop(t + d + 0.02)
  } catch {
    /* pas de son */
  }
}

export function buzzStep() {
  if (native) Haptics.vibrate({ duration: 400 }).catch(() => {})
  else if ('vibrate' in navigator) navigator.vibrate?.(400)
}

const REMINDER_BASE = 3000
const REMINDER_MAX = 60

/** Remplace tous les rappels programmés (séance du jour, tâches à heure fixe). */
export async function scheduleReminders(items: { at: number; title: string; body: string }[]) {
  if (!native) return
  try {
    const pending = await LocalNotifications.getPending()
    const old = pending.notifications.filter((n) => n.id >= REMINDER_BASE && n.id < REMINDER_BASE + REMINDER_MAX)
    if (old.length) await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) })
  } catch {
    /* rien */
  }
  const future = items.filter((x) => x.at > Date.now()).slice(0, REMINDER_MAX)
  if (!future.length || !(await ensurePermission())) return
  await ensureChannels()
  try {
    await LocalNotifications.schedule({
      notifications: future.map((x, i) => ({
        id: REMINDER_BASE + i,
        title: x.title,
        body: x.body,
        channelId: 'rappels',
        schedule: { at: new Date(x.at), allowWhileIdle: true },
      })),
    })
  } catch {
    /* rien */
  }
}

/** Notification permanente « séance en cours ». */
export async function showOngoing(title: string, body: string) {
  if (!(await ensurePermission())) return
  await ensureChannels()
  try {
    await LocalNotifications.schedule({
      notifications: [{ id: ONGOING_ID, title, body, channelId: 'seance', ongoing: true, autoCancel: false }],
    })
  } catch {
    /* rien */
  }
}

export async function hideOngoing() {
  if (!native) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ONGOING_ID }, { id: REST_ID }] })
    await cancelIntervals()
  } catch {
    /* rien */
  }
}

export async function hideOngoingOnly() {
  if (!native) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ONGOING_ID }] })
  } catch {
    /* rien */
  }
}

export function tap() {
  if (native) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

export function buzzRestOver() {
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  else if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
}

export function setKeepAwake(on: boolean) {
  if (!native) return
  ;(on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {})
}
