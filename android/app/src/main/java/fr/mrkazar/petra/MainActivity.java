package fr.mrkazar.petra;

import android.os.Bundle;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        registerPlugin(AppIconPlugin.class);
        registerPlugin(RestTimerPlugin.class);
        super.onCreate(savedInstanceState);
        // Fond du thème choisi (retenu par AppIconPlugin) dès l'ouverture, avant que la page ne s'affiche.
        String bg = getSharedPreferences(AppIconPlugin.PREFS, MODE_PRIVATE).getString(AppIconPlugin.BG, null);
        if (bg == null) return;
        try {
            int c = Color.parseColor(bg);
            getWindow().setBackgroundDrawable(new ColorDrawable(c));
            if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().setBackgroundColor(c);
        } catch (IllegalArgumentException ignored) {
            // couleur illisible : fond par défaut
        }
    }
}
