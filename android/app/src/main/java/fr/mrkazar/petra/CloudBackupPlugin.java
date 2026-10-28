package fr.mrkazar.petra;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Sauvegarde dans le cloud sans compte à relier : l'utilisateur crée une fois un fichier dans Google Drive,
 * OneDrive (ou tout autre stockage du sélecteur Android), PETRA garde le droit d'écrire dedans et le remplace
 * après chaque séance. L'appli Drive / OneDrive se charge ensuite de l'envoyer.
 */
@CapacitorPlugin(name = "CloudBackup")
public class CloudBackupPlugin extends Plugin {

    /** Ouvre le sélecteur « Enregistrer sous » d'Android. */
    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "petra-sauvegarde.json"));
        startActivityForResult(call, intent, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.reject("Annulé", "CANCELLED");
            return;
        }
        Uri uri = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (SecurityException e) {
            // Le stockage ne garde pas le droit après un redémarrage : l'écriture échouera plus tard et l'appli le dira.
        }
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", displayName(uri));
        ret.put("provider", providerLabel(uri.getAuthority()));
        call.resolve(ret);
    }

    /** Remplace le contenu du fichier choisi. */
    @PluginMethod
    public void write(PluginCall call) {
        String uriText = call.getString("uri");
        String text = call.getString("data");
        if (uriText == null || text == null) {
            call.reject("Paramètres manquants");
            return;
        }
        new Thread(() -> {
            Uri uri = Uri.parse(uriText);
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            try {
                writeBytes(uri, "wt", bytes);
                call.resolve();
            } catch (Exception first) {
                try {
                    // Certains stockages ne connaissent pas le mode « wt » (écraser) : « w » remplace aussi le fichier.
                    writeBytes(uri, "w", bytes);
                    call.resolve();
                } catch (Exception e) {
                    call.reject(e.getMessage() != null ? e.getMessage() : "Écriture impossible", e);
                }
            }
        }).start();
    }

    /** Oublie le fichier (rend le droit d'écriture). */
    @PluginMethod
    public void release(PluginCall call) {
        String uriText = call.getString("uri");
        if (uriText != null) {
            try {
                getContext().getContentResolver().releasePersistableUriPermission(Uri.parse(uriText), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (SecurityException e) {
                // déjà rendu
            }
        }
        call.resolve();
    }

    private void writeBytes(Uri uri, String mode, byte[] bytes) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        try (OutputStream out = resolver.openOutputStream(uri, mode)) {
            if (out == null) throw new Exception("Fichier introuvable");
            out.write(bytes);
            out.flush();
        }
    }

    private String displayName(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception e) {
            // nom inconnu
        }
        return "petra-sauvegarde.json";
    }

    private static String providerLabel(String authority) {
        if (authority == null) return "Stockage";
        if (authority.startsWith("com.google.android.apps.docs")) return "Google Drive";
        if (authority.startsWith("com.microsoft.skydrive")) return "OneDrive";
        if (authority.contains("dropbox")) return "Dropbox";
        if (authority.startsWith("com.android.externalstorage") || authority.startsWith("com.android.providers.downloads")) return "Téléphone";
        return "Stockage";
    }
}
