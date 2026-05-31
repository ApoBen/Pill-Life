package com.example.pilllife

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class AndroidBridge(private val activity: MainActivity) {

    private val permissionRequestCode = 1001

    @JavascriptInterface
    fun hasPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                permissionRequestCode
            )
        }
    }

    @JavascriptInterface
    fun scheduleNotification(id: String, title: String, body: String, delayMs: Long) {
        scheduleNotification(id, title, body, delayMs, "", 0.0)
    }

    @JavascriptInterface
    fun scheduleNotification(id: String, title: String, body: String, delayMs: Long, drugId: String, doseMg: Double) {
        val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(activity, NotificationReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("body", body)
            putExtra("drugId", drugId)
            putExtra("doseMg", doseMg)
        }

        val requestCode = id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            activity,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerTime = System.currentTimeMillis() + delayMs

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
        } catch (e: SecurityException) {
            // Fallback for missing exact alarm permission on Android 12+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
        }
    }

    @JavascriptInterface
    fun cancelNotification(id: String) {
        val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(activity, NotificationReceiver::class.java)
        val requestCode = id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            activity,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    @JavascriptInterface
    fun updateWidgetData(jsonData: String) {
        val prefs = activity.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("widget_data", jsonData).apply()
        triggerWidgetUpdate()
    }


    @JavascriptInterface
    fun updateRawData(drugsJson: String, dosesJson: String) {
        val prefs = activity.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("raw_drugs", drugsJson)
            .putString("raw_doses", dosesJson)
            .apply()
        triggerWidgetUpdate()
    }

    @JavascriptInterface
    fun getRawDrugs(): String {
        val prefs = activity.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        return prefs.getString("raw_drugs", "[]") ?: "[]"
    }

    @JavascriptInterface
    fun getRawDoses(): String {
        val prefs = activity.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        return prefs.getString("raw_doses", "[]") ?: "[]"
    }

    private fun triggerWidgetUpdate() {
        val intent = Intent(activity, PillLifeWidget::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val widgetManager = AppWidgetManager.getInstance(activity)
        val ids = widgetManager.getAppWidgetIds(
            ComponentName(activity, PillLifeWidget::class.java)
        )
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        activity.sendBroadcast(intent)
    }
}
