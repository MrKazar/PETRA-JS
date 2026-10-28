package fr.mrkazar.petra;

import android.app.Activity;
import android.app.PendingIntent;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;

import java.util.Collections;

/**
 * Connexion au compte Google pour la sauvegarde : demande l'accès au Drive limité aux fichiers créés par PETRA
 * (drive.file) et renvoie un jeton d'accès ; l'envoi et la lecture du fichier se font ensuite depuis l'appli.
 * Ne marche que si l'appli est déclarée dans Google Cloud (ID client Android : package + empreinte SHA-1).
 */
@CapacitorPlugin(name = "GoogleDrive")
public class GoogleDrivePlugin extends Plugin {
    private static final String DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";

    private ActivityResultLauncher<IntentSenderRequest> consent;
    private PluginCall pending;

    @Override
    public void load() {
        consent = getActivity().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), result -> {
            PluginCall call = pending;
            pending = null;
            if (call == null) return;
            if (result.getResultCode() != Activity.RESULT_OK) {
                call.reject("Connexion annulée", "CANCELLED");
                return;
            }
            try {
                AuthorizationResult auth = Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData());
                resolveToken(call, auth);
            } catch (ApiException e) {
                call.reject("Connexion refusée par Google (" + e.getStatusCode() + ")", String.valueOf(e.getStatusCode()));
            }
        });
    }

    /** Renvoie un jeton d'accès ; avec interactive=true, affiche le choix du compte et l'autorisation si besoin. */
    @PluginMethod
    public void authorize(PluginCall call) {
        boolean interactive = Boolean.TRUE.equals(call.getBoolean("interactive", true));
        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope(DRIVE_FILE)))
            .build();
        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener(auth -> {
                if (!auth.hasResolution()) {
                    resolveToken(call, auth);
                    return;
                }
                if (!interactive) {
                    call.reject("Connexion à refaire", "NEED_CONSENT");
                    return;
                }
                PendingIntent intent = auth.getPendingIntent();
                if (intent == null) {
                    call.reject("Connexion impossible");
                    return;
                }
                pending = call;
                consent.launch(new IntentSenderRequest.Builder(intent.getIntentSender()).build());
            })
            .addOnFailureListener(e -> {
                String code = e instanceof ApiException ? String.valueOf(((ApiException) e).getStatusCode()) : "ERROR";
                call.reject("Connexion refusée par Google (" + code + ")", code);
            });
    }

    private void resolveToken(PluginCall call, AuthorizationResult auth) {
        String token = auth.getAccessToken();
        if (token == null) {
            call.reject("Google n'a pas donné d'accès au Drive");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("token", token);
        call.resolve(ret);
    }
}
