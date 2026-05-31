package com.example.pilllife

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class WidgetUpdateWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        val drugsStr = prefs.getString("raw_drugs", "[]") ?: "[]"
        val dosesStr = prefs.getString("raw_doses", "[]") ?: "[]"

        try {
            val drugsArray = JSONArray(drugsStr)
            val dosesArray = JSONArray(dosesStr)
            val nowMs = System.currentTimeMillis()
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            format.timeZone = TimeZone.getTimeZone("UTC")

            val pinnedDrugs = ArrayList<JSONObject>()
            for (i in 0 until drugsArray.length()) {
                val drug = drugsArray.getJSONObject(i)
                if (drug.optBoolean("pinnedToWidget", false)) {
                    pinnedDrugs.add(drug)
                }
            }
            val usePinnedOnly = pinnedDrugs.isNotEmpty()

            val activeLevels = ArrayList<JSONObject>()

            for (i in 0 until drugsArray.length()) {
                val drug = drugsArray.getJSONObject(i)
                val drugId = drug.getString("id")
                val drugName = drug.getString("name")
                val drugColor = drug.optString("color", "#8b5cf6")
                val absorptionHours = drug.optDouble("absorptionHours", 1.0)
                val halfLifeHours = drug.optDouble("halfLifeHours", 6.0)
                val doseMg = drug.optDouble("doseMg", 0.0)
                val pinned = drug.optBoolean("pinnedToWidget", false)

                var totalLevel = 0.0

                for (j in 0 until dosesArray.length()) {
                    val dose = dosesArray.getJSONObject(j)
                    if (dose.getString("drugId") == drugId) {
                        val takenAtStr = dose.getString("takenAt")
                        val takenAtDate = format.parse(takenAtStr)
                        if (takenAtDate != null) {
                            val takenAtMs = takenAtDate.time
                            val hoursElapsed = (nowMs - takenAtMs).toDouble() / (3600.0 * 1000.0)
                            if (hoursElapsed > 0) {
                                totalLevel += calculateBloodLevel(
                                    dose.getDouble("doseMg"),
                                    hoursElapsed,
                                    absorptionHours,
                                    halfLifeHours
                                )
                            }
                        }
                    }
                }

                if (usePinnedOnly) {
                    if (pinned) {
                        val activeObj = JSONObject().apply {
                            put("id", drugId)
                            put("name", drugName)
                            put("color", drugColor)
                            put("doseMg", doseMg)
                            put("level", String.format(Locale.US, "%.1f mg", totalLevel))
                            put("pinned", true)
                        }
                        activeLevels.add(activeObj)
                    }
                } else {
                    if (totalLevel > 0.01) {
                        val activeObj = JSONObject().apply {
                            put("id", drugId)
                            put("name", drugName)
                            put("color", drugColor)
                            put("doseMg", doseMg)
                            put("level", String.format(Locale.US, "%.1f mg", totalLevel))
                            put("pinned", false)
                        }
                        activeLevels.add(activeObj)
                    }
                }
            }

            // Sort: pinned first, then by level descending
            activeLevels.sortWith(Comparator { a, b ->
                val aPinned = a.optBoolean("pinned", false)
                val bPinned = b.optBoolean("pinned", false)
                if (aPinned && !bPinned) return@Comparator -1
                if (!aPinned && bPinned) return@Comparator 1

                val aVal = a.getString("level").replace(" mg", "").toDoubleOrNull() ?: 0.0
                val bVal = b.getString("level").replace(" mg", "").toDoubleOrNull() ?: 0.0
                bVal.compareTo(aVal)
            })

            val finalArray = JSONArray()
            for (i in 0 until activeLevels.size) {
                finalArray.put(activeLevels[i])
            }

            prefs.edit().putString("widget_data", finalArray.toString()).apply()

            // Broadcast update to the widget
            val intent = Intent(applicationContext, PillLifeWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val widgetManager = AppWidgetManager.getInstance(applicationContext)
            val ids = widgetManager.getAppWidgetIds(
                ComponentName(applicationContext, PillLifeWidget::class.java)
            )
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            applicationContext.sendBroadcast(intent)

        } catch (e: Exception) {
            e.printStackTrace()
            return Result.failure()
        }

        return Result.success()
    }

    private fun calculateBloodLevel(
        doseMg: Double,
        tHours: Double,
        absorptionHours: Double,
        halfLifeHours: Double
    ): Double {
        if (tHours <= 0) return 0.0
        val ke = Math.log(2.0) / halfLifeHours
        val ka = Math.max(ke * 1.1, 3.0 / absorptionHours)
        val diff = ka - ke
        if (Math.abs(diff) < 1e-10) {
            return doseMg * ka * tHours * Math.exp(-ke * tHours)
        }
        val level = (doseMg * ka / diff) * (Math.exp(-ke * tHours) - Math.exp(-ka * tHours))
        return Math.max(0.0, level)
    }
}
