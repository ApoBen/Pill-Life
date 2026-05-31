package com.example.pilllife

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "com.example.pilllife.TAKE_DOSE") {
            val drugId = intent.getStringExtra("drugId") ?: return
            val doseMg = intent.getDoubleExtra("doseMg", 0.0)
            val notificationId = intent.getIntExtra("notificationId", -1)

            val prefs = context.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
            val drugsStr = prefs.getString("raw_drugs", "[]") ?: "[]"
            val dosesStr = prefs.getString("raw_doses", "[]") ?: "[]"

            // 1. Add new dose entry
            val doseId = System.currentTimeMillis().toString(36) + (1000..9999).random().toString(36)
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")
            val takenAt = format.format(Date())

            val newDoseJson = JSONObject().apply {
                put("id", doseId)
                put("drugId", drugId)
                put("doseMg", doseMg)
                put("takenAt", takenAt)
            }

            try {
                val dosesArray = JSONArray(dosesStr)
                dosesArray.put(newDoseJson)
                prefs.edit().putString("raw_doses", dosesArray.toString()).apply()
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // 2. Cancel current notification
            if (notificationId != -1) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.cancel(notificationId)
            }

            // 3. Find drug parameters to schedule peak & next dose alarms
            try {
                val drugsArray = JSONArray(drugsStr)
                var drugObj: JSONObject? = null
                for (i in 0 until drugsArray.length()) {
                    val d = drugsArray.getJSONObject(i)
                    if (d.getString("id") == drugId) {
                        drugObj = d
                        break
                    }
                }

                if (drugObj != null) {
                    val drugName = drugObj.getString("name")
                    val absorptionHours = drugObj.optDouble("absorptionHours", 1.0)
                    val halfLifeHours = drugObj.optDouble("halfLifeHours", 6.0)
                    val notifyOnPeak = drugObj.optBoolean("notifyOnPeak", false)
                    val scheduleHours = drugObj.optDouble("scheduleHours", 0.0)

                    // 3a. Schedule peak concentration notification if enabled
                    if (notifyOnPeak) {
                        val peakHours = calculatePeakTime(absorptionHours, halfLifeHours)
                        val peakMinutes = Math.round(peakHours * 60)
                        val peakDelayMs = (peakHours * 3600 * 1000).toLong()

                        val title = "💊 $drugName — Pik Seviye!"
                        val body = "$doseMg mg dozunuz $peakMinutes dakika sonra pik kan seviyesine ulaştı."
                        
                        // Schedule peak notification (no drugId/doseMg passed to avoid "Aldım" button)
                        scheduleAlarmNotification(context, doseId, title, body, peakDelayMs, "", 0.0)
                    }

                    // 3b. Schedule next dose reminder if scheduled
                    if (scheduleHours > 0.0) {
                        val reminderDelayMs = (scheduleHours * 3600 * 1000).toLong()
                        val reminderId = "reminder-$drugId"
                        val title = "💊 Doz Zamanı — $drugName"
                        val body = "$drugName için yeni doz zamanınız geldi ($doseMg mg)."

                        // Schedule reminder notification (includes drugId/doseMg for "Aldım" button)
                        scheduleAlarmNotification(context, reminderId, title, body, reminderDelayMs, drugId, doseMg)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // 4. Trigger Widget Update
            val updateIntent = Intent(context, PillLifeWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val widgetManager = AppWidgetManager.getInstance(context)
            val ids = widgetManager.getAppWidgetIds(
                ComponentName(context, PillLifeWidget::class.java)
            )
            updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(updateIntent)
        }
    }

    private fun calculatePeakTime(absorptionHours: Double, halfLifeHours: Double): Double {
        val ke = Math.log(2.0) / halfLifeHours
        val ka = Math.max(ke * 1.1, 3.0 / absorptionHours)
        val diff = ka - ke
        if (Math.abs(diff) < 1e-10) {
            return 1.0 / ke
        }
        return Math.log(ka / ke) / diff
    }

    private fun scheduleAlarmNotification(
        context: Context,
        id: String,
        title: String,
        body: String,
        delayMs: Long,
        drugId: String,
        doseMg: Double
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, NotificationReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("body", body)
            putExtra("drugId", drugId)
            putExtra("doseMg", doseMg)
        }

        val requestCode = id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
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
}
