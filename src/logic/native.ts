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
