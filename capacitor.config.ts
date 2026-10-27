import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'fr.mrkazar.petra',
  appName: 'PETRA',
  webDir: 'dist',
  backgroundColor: '#16130f',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_petra',
      iconColor: '#c9a24b',
    },
  },
}

export default config
