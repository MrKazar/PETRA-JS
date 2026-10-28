package fr.mrkazar.petra;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Icône du lanceur selon le thème : chaque thème a son activity-alias dans le manifeste,
 * on active celle du thème choisi et on désactive les autres.
 * Android ferme l'appli quand on désactive l'entrée qui l'a lancée : le changement est donc
 * mémorisé et appliqué seulement quand l'appli passe en arrière-plan.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    private static final String[] ICONS = { "Militaire", "Police", "Gendarmerie", "Forces", "Minimal", "Vantablack" };

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("name", "Militaire");
        boolean known = false;
        for (String icon : ICONS) known |= icon.equals(name);
        if (!known) {
            call.reject("Icône inconnue : " + name);
            return;
        }
        Context ctx = getContext();
        String current = currentIcon(ctx.getPackageManager(), ctx);
        pending = name.equals(current) ? null : name;
        JSObject ret = new JSObject();
        ret.put("changed", pending != null);
        call.resolve(ret);
    }

    private String pending;

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        if (pending == null) return;
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        // D'abord activer la nouvelle entrée, pour qu'il y en ait toujours une dans le lanceur.
        setEnabled(pm, ctx, pending, true);
        for (String icon : ICONS) if (!icon.equals(pending)) setEnabled(pm, ctx, icon, false);
        pending = null;
    }

    @PluginMethod
    public void get(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("name", currentIcon(getContext().getPackageManager(), getContext()));
        call.resolve(ret);
    }

    private static ComponentName component(Context ctx, String icon) {
        return new ComponentName(ctx.getPackageName(), "fr.mrkazar.petra.Icon" + icon);
    }

    private static void setEnabled(PackageManager pm, Context ctx, String icon, boolean on) {
        pm.setComponentEnabledSetting(
            component(ctx, icon),
            on ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        );
    }

    /** Entrée active : état forcé par l'appli, sinon celui du manifeste (militaire par défaut). */
    private static String currentIcon(PackageManager pm, Context ctx) {
        for (String icon : ICONS) {
            int state = pm.getComponentEnabledSetting(component(ctx, icon));
            if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return icon;
            if (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && icon.equals("Militaire")) {
                boolean otherForced = false;
                for (String other : ICONS) {
                    if (!other.equals("Militaire") && pm.getComponentEnabledSetting(component(ctx, other)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) otherForced = true;
                }
                if (!otherForced) return icon;
            }
        }
        return "Militaire";
    }
}
