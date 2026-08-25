package com.inhousesoftware.jobs;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApplicationBrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
