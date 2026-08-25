package com.inhousesoftware.jobs;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.Locale;
import org.json.JSONObject;

public class ApplicationActivity extends AppCompatActivity {
    public static final String EXTRA_URL = "application_url";
    public static final String EXTRA_PROFILE = "candidate_profile";
    public static final String EXTRA_JOB = "job_summary";
    private static final int FILE_CHOOSER_REQUEST = 9042;
    private static final int ORANGE = Color.rgb(224, 122, 60);

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileCallback;
    private String profileJson = "{}";
    private String cvPath = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String url = getIntent().getStringExtra(EXTRA_URL);
        profileJson = getIntent().getStringExtra(EXTRA_PROFILE);
        if (profileJson == null) profileJson = "{}";
        try { cvPath = new JSONObject(profileJson).optString("cvPath", ""); }
        catch (Exception ignored) { cvPath = ""; }
        if (url == null || !isWebUrl(Uri.parse(url))) {
            finish();
            return;
        }

        getWindow().setStatusBarColor(Color.rgb(245, 245, 240));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(245, 245, 240));
        root.addView(createToolbar(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(ORANGE));
        root.addView(progressBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.getSettings().setUserAgentString(webView.getSettings().getUserAgentString() + " InhouseJobs/0.1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            WebView.startSafeBrowsing(this, success -> {});
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri destination = request.getUrl();
                if (isWebUrl(destination)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, destination)); }
                catch (ActivityNotFoundException ignored) { Toast.makeText(ApplicationActivity.this, destination.toString(), Toast.LENGTH_SHORT).show(); }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String loadedUrl) {
                super.onPageFinished(view, loadedUrl);
                injectProfile();
            }

        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                progressBar.setProgress(progress);
                progressBar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                File storedCv = cvPath.isEmpty() ? null : new File(getFilesDir(), cvPath);
                if (storedCv != null && storedCv.isFile()) {
                    Uri cvUri = FileProvider.getUriForFile(ApplicationActivity.this, getPackageName() + ".fileprovider", storedCv);
                    fileCallback.onReceiveValue(new Uri[]{cvUri});
                    fileCallback = null;
                    Toast.makeText(ApplicationActivity.this, "Saved CV attached", Toast.LENGTH_SHORT).show();
                    return true;
                }
                Intent picker = params.createIntent();
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*");
                try { startActivityForResult(picker, FILE_CHOOSER_REQUEST); return true; }
                catch (ActivityNotFoundException error) { fileCallback = null; return false; }
            }
        });

        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        webView.loadUrl(url);
    }

    private View createToolbar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(10), 0, dp(10), 0);
        bar.setBackgroundColor(Color.rgb(245, 245, 240));

        Button close = button("Close");
        close.setOnClickListener(view -> finish());
        bar.addView(close, new LinearLayout.LayoutParams(dp(76), dp(42)));

        TextView title = new TextView(this);
        title.setText("⌃  inhouse jobs");
        title.setTextColor(Color.rgb(26, 26, 26));
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(42), 1));

        Button fill = button("Fill");
        fill.setTextColor(ORANGE);
        fill.setOnClickListener(view -> injectProfile());
        bar.addView(fill, new LinearLayout.LayoutParams(dp(76), dp(42)));
        return bar;
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(13);
        button.setTextColor(Color.rgb(26, 26, 26));
        button.setBackgroundColor(Color.TRANSPARENT);
        return button;
    }

    private void injectProfile() {
        if (webView == null) return;
        String encodedProfile = JSONObject.quote(profileJson);
        String script = "(function(){" +
            "const p=JSON.parse(" + encodedProfile + ");" +
            "const clean=v=>String(v||'').trim();" +
            "const first=clean(p.fullName).split(/\\s+/)[0]||'';" +
            "const last=clean(p.fullName).split(/\\s+/).slice(1).join(' ');" +
            "const entries=[" +
            "{k:['first_name','firstname','first-name','given-name'],v:first}," +
            "{k:['last_name','lastname','last-name','family-name'],v:last}," +
            "{k:['full_name','fullname','full-name','your-name','name'],v:p.fullName}," +
            "{k:['email','e-mail'],v:p.email}," +
            "{k:['phone','telephone','mobile','tel'],v:p.phone}," +
            "{k:['city','location','address-level2'],v:p.city}," +
            "{k:['linkedin','linkedin_url','linkedin-url'],v:p.linkedin}," +
            "{k:['website','portfolio','personal_url','personal-url'],v:p.website}," +
            "{k:['skills','skillset'],v:p.skills}," +
            "{k:['cover_letter','coverletter','cover-letter','motivation'],v:p.coverLetterTemplate}" +
            "];" +
            "const descriptor=e=>[e.name,e.id,e.autocomplete,e.placeholder,e.getAttribute('aria-label')].filter(Boolean).join(' ').toLowerCase();" +
            "let count=0; document.querySelectorAll('input:not([type=file]):not([type=hidden]):not([type=submit]),textarea').forEach(e=>{" +
            "if(e.value||e.disabled||e.readOnly)return;const d=descriptor(e);const hit=entries.find(x=>x.v&&x.k.some(k=>d.includes(k)));" +
            "if(!hit)return;const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value')?.set;setter?setter.call(e,clean(hit.v)):e.value=clean(hit.v);" +
            "e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.style.outline='2px solid #E07A3C';e.style.outlineOffset='1px';count++;});" +
            "return String(count);})();";
        webView.evaluateJavascript(script, value -> {
            String count = value == null ? "0" : value.replace("\"", "");
            Toast.makeText(this, String.format(Locale.getDefault(), "%s fields filled — review before submitting", count), Toast.LENGTH_SHORT).show();
        });
    }

    private boolean isWebUrl(Uri uri) {
        String scheme = uri.getScheme();
        return uri.getHost() != null && ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme));
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) return;
        fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
