package fr.mrkazar.petra;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Compte à rebours du repos sur l'écran verrouillé : une notification dont le chronomètre défile
 * tout seul (Android l'anime, sans service au premier plan), avec les boutons « +15 s » et « Passer ».
 * La notification de fin de repos (sonnerie, vibration) reste programmée à part par l'appli.
 */
@CapacitorPlugin(name = "RestTimer")
public class RestTimerPlugin extends Plugin {

    static final String CHANNEL = "repos_chrono";
    static final int NOTIF_ID = 1003;
    static final String EXTRA_KIND = "kind";

    private static RestTimerPlugin instance;

    @Override
    public void load() {
        instance = this;
        createChannel(getContext());
    }

    static void createChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Repos en cours", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Compte à rebours du repos, visible écran verrouillé");
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setShowBadge(false);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    private PendingIntent action(Context ctx, String kind, int code) {
        Intent i = new Intent(ctx, RestActionReceiver.class);
        i.putExtra(EXTRA_KIND, kind);
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @PluginMethod
    public void show(PluginCall call) {
        Double endsAtD = call.getDouble("endsAt");
        if (endsAtD == null) {
            call.reject("endsAt manquant");
            return;
        }
        long endsAt = endsAtD.longValue();
        long left = endsAt - System.currentTimeMillis();
        Context ctx = getContext();
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (left <= 0 || nm == null) {
            if (nm != null) nm.cancel(NOTIF_ID);
            call.resolve();
            return;
        }
        createChannel(ctx);
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent openPi = open == null ? null : PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(R.drawable.ic_stat_petra)
            .setContentTitle(call.getString("title", "Repos"))
            .setContentText(call.getString("body", ""))
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(endsAt)
            .setShowWhen(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_STOPWATCH)
            .setPriority(Notification.PRIORITY_LOW)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(new Notification.Action.Builder(null, "+15 s", action(ctx, "add", 1)).build())
            .addAction(new Notification.Action.Builder(null, "Passer", action(ctx, "skip", 2)).build());
        // Disparaît toute seule à la fin du repos (sinon le chronomètre passerait en négatif).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) b.setTimeoutAfter(left);
        if (openPi != null) b.setContentIntent(openPi);
        try {
            nm.notify(NOTIF_ID, b.build());
        } catch (SecurityException e) {
            // Notifications refusées : le minuteur à l'écran reste la référence.
        }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        cancel(getContext());
        call.resolve();
    }

    static void cancel(Context ctx) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    /** Bouton de la notification : transmis à l'appli (gardé jusqu'à ce qu'elle l'écoute). */
    static void onAction(String kind) {
        RestTimerPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("kind", kind);
        p.notifyListeners("action", data, true);
    }
}
