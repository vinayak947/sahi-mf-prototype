package com.sahi.mf;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * SAHI MF: a bare WebView on the Vite dev server running on the Mac.
 * `npm run phone` forwards the phone's localhost:8443 to the Mac over USB
 * (adb reverse), so every save hot-reloads here. No rebuild needed.
 */
public class MainActivity extends Activity {
    static final String URL = "http://localhost:8443/";

    WebView web;
    final Handler main = new Handler(Looper.getMainLooper());
    boolean offline;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        WebView.setWebContentsDebuggingEnabled(true); // chrome://inspect on the Mac
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.addJavascriptInterface(this, "SahiShell");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) showOffline();
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                if (offline) return;
                // Paint the system bars with the page's theme-color and follow its changes.
                v.evaluateJavascript(
                    "(function(){var m=document.querySelector('meta[name=theme-color]');"
                  + "function send(){SahiShell.bar(m?m.content:getComputedStyle(document.body).backgroundColor)}"
                  + "send();if(m)new MutationObserver(send).observe(m,{attributes:true});})()", null);
            }
        });
        // Keep the page clear of the status and navigation bars.
        web.setOnApplyWindowInsetsListener((v, in) -> {
            android.graphics.Insets i = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsets.CONSUMED;
        });
        setContentView(web);
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        }
        web.loadUrl(URL);
    }

    @JavascriptInterface
    public void bar(String css) {
        main.post(() -> {
            int c = parse(css);
            web.setBackgroundColor(c);
            getWindow().getDecorView().setBackgroundColor(c);
            boolean light = Color.luminance(c) > 0.5f;
            if (android.os.Build.VERSION.SDK_INT >= 30 && getWindow().getInsetsController() != null) {
                int f = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                      | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                getWindow().getInsetsController().setSystemBarsAppearance(light ? f : 0, f);
            }
        });
    }

    static int parse(String css) {
        try {
            css = css.trim();
            if (css.startsWith("rgb")) {
                String[] p = css.substring(css.indexOf('(') + 1, css.indexOf(')')).split(",");
                return Color.rgb(Integer.parseInt(p[0].trim()), Integer.parseInt(p[1].trim()), Integer.parseInt(p[2].trim()));
            }
            return Color.parseColor(css);
        } catch (Exception e) {
            return Color.WHITE;
        }
    }

    void showOffline() {
        offline = true;
        bar("#111111");
        web.loadDataWithBaseURL(null,
            "<html><body style='margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;"
          + "align-items:center;background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:24px;box-sizing:border-box'>"
          + "<h2 style='margin:0 0 12px'>SAHI MF</h2>"
          + "<p style='opacity:.8;line-height:1.5'>Can't reach the prototype on your Mac.<br>Plug in USB and run:</p>"
          + "<code style='background:#222;padding:8px 12px;border-radius:6px'>npm run phone</code>"
          + "<p style='opacity:.5;font-size:13px;margin-top:20px'>Retrying automatically…</p></body></html>",
            "text/html", "utf-8", null);
        main.postDelayed(this::retry, 2000);
    }

    void retry() {
        if (isFinishing()) return;
        offline = false;
        web.loadUrl(URL);
    }

    void back() {
        if (web.canGoBack()) web.goBack();
        else finish();
    }

    @Override
    public void onBackPressed() { back(); } // Android 12 and older

}
