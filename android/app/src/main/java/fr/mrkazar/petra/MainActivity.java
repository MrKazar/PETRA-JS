package fr.mrkazar.petra;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        registerPlugin(AppIconPlugin.class);
        registerPlugin(CloudBackupPlugin.class);
        registerPlugin(GoogleDrivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
