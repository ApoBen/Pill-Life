package com.example.pilllife

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private val permissionRequestCode = 1001
    private var printJob: android.print.PrintJob? = null
    private var printAdapter: android.print.PrintDocumentAdapter? = null

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Keep within system windows to avoid status bar overlap with app controls
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = android.graphics.Color.parseColor("#06060f")

        // Schedule periodic widget updates (battery-optimized via WorkManager)
        val widgetWorkRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "PillLifeWidgetUpdater",
            ExistingPeriodicWorkPolicy.KEEP,
            widgetWorkRequest
        )

        webView = WebView(this).apply {
            fitsSystemWindows = true
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                
                // Better mobile viewport support
                useWideViewPort = true
                loadWithOverviewMode = true
            }

            // Add JavaScript Interface Bridge
            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")

            // Set up WebViewAssetLoader to intercept requests and load local assets safely
            val assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this@MainActivity))
                .build()

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: android.webkit.WebResourceRequest
                ): android.webkit.WebResourceResponse? {
                    return assetLoader.shouldInterceptRequest(request.url)
                }
            }

            // Load the index.html from the virtual https://appassets.androidplatform.net server
            loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        }

        setContentView(webView)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == permissionRequestCode) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            webView.post {
                webView.evaluateJavascript("javascript:if(window.onAndroidPermissionResult) window.onAndroidPermissionResult($granted);", null)
            }
        }
    }

    fun printWebView() {
        runOnUiThread {
            val printManager = getSystemService(android.content.Context.PRINT_SERVICE) as android.print.PrintManager
            val adapter = webView.createPrintDocumentAdapter("Pill-Life Raporu")
            printAdapter = adapter
            val jobName = "Pill-Life Raporu"
            printJob = printManager.print(jobName, adapter, android.print.PrintAttributes.Builder().build())
        }
    }
}
