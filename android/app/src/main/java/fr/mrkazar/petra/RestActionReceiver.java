package fr.mrkazar.petra;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reçoit les boutons « +15 s » et « Passer » de la notification de repos. */
public class RestActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String kind = intent.getStringExtra(RestTimerPlugin.EXTRA_KIND);
        if (kind == null) return;
        if ("skip".equals(kind)) RestTimerPlugin.cancel(context);
        RestTimerPlugin.onAction(kind);
    }
}
