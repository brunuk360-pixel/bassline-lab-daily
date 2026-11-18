package uk.co.basslinelab.daily;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView web;
    private static final String HOME = "https://brunuk360-pixel.github.io/bassline-lab-daily/";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11,18,34));
        getWindow().setNavigationBarColor(Color.rgb(11,18,34));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11,18,34));
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "brunuk360-pixel.github.io".equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/bassline-lab-daily/")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception ignored) { Toast.makeText(MainActivity.this, "No app found to open link", Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        web.loadUrl(HOME);
    }

    @Override public void onBackPressed() {
        // Prefer in-page edition navigation; only exit when the root cannot go back.
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
