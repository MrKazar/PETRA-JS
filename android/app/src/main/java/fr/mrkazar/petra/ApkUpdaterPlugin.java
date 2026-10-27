package fr.mrkazar.petra;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Mise à jour depuis l'appli : télécharge l'APK d'une release GitHub puis le confie à l'installeur Android.
 * Android n'installe par-dessus que si l'APK est signé avec la même clé que la version installée.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("allowed", canRequestInstalls());
        call.resolve(ret);
    }

    /** Ouvre le réglage « Installer des applis inconnues » pour PETRA. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    /** Télécharge l'APK (événements « progress » de 0 à 1) puis lance l'installation. */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Adresse de téléchargement invalide");
            return;
        }
        if (!canRequestInstalls()) {
            call.reject("PERMISSION", "PERMISSION");
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "updates");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Dossier de téléchargement indisponible");
                File apk = new File(dir, "petra-update.apk");
                download(url, apk);
                install(apk);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Téléchargement impossible", e);
            }
        }).start();
    }

    private boolean canRequestInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void download(String url, File target) throws Exception {
        HttpURLConnection conn = null;
        // GitHub renvoie vers un autre hôte : on suit les redirections à la main.
        for (int i = 0; i < 5; i++) {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                url = conn.getHeaderField("Location");
                conn.disconnect();
                if (url == null || !url.startsWith("https://")) throw new Exception("Redirection invalide");
                continue;
            }
            if (code != 200) throw new Exception("Erreur HTTP " + code);
            break;
        }
        long total = conn.getContentLengthLong();
        long read = 0;
        long lastEmit = 0;
        try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(target)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
                read += n;
                long now = System.currentTimeMillis();
                if (total > 0 && now - lastEmit > 200) {
                    lastEmit = now;
                    JSObject p = new JSObject();
                    p.put("progress", (double) read / total);
                    notifyListeners("progress", p);
                }
            }
        } finally {
            conn.disconnect();
        }
        if (total > 0 && read != total) throw new Exception("Téléchargement incomplet");
    }

    private void install(File apk) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
