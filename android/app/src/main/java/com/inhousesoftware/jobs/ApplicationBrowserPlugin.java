package com.inhousesoftware.jobs;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApplicationBrowser")
public class ApplicationBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url", "");
        Uri parsed = Uri.parse(url);
        String scheme = parsed.getScheme();
        if (parsed.getHost() == null || !("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
            call.reject("Only valid HTTP or HTTPS application URLs are supported.");
            return;
        }

        Intent intent = new Intent(getContext(), ApplicationActivity.class);
        intent.setPackage(getContext().getPackageName());
        intent.putExtra(ApplicationActivity.EXTRA_URL, url);
        intent.putExtra(ApplicationActivity.EXTRA_PROFILE, call.getString("profile", "{}"));
        intent.putExtra(ApplicationActivity.EXTRA_JOB, call.getString("job", "{}"));
        getActivity().startActivity(intent);
        call.resolve(new JSObject());
    }
}
