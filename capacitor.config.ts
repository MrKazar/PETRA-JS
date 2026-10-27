import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'fr.mrkazar.petra',
  appName: 'PETRA',
  webDir: 'dist',
  backgroundColor: '#0D0F0E',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_petra',
      iconColor: '#68764D',
    },
  },
}

export default config
