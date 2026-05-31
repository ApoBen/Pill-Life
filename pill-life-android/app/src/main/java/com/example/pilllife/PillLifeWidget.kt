package com.example.pilllife

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONException

class PillLifeWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val ids = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, PillLifeWidget::class.java)
            )
            onUpdate(context, appWidgetManager, ids)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
            val dataStr = prefs.getString("widget_data", "[]") ?: "[]"

            val views = RemoteViews(context.packageName, R.layout.pill_life_widget)

            // Setup click intent to open main activity when touching the widget root
            val clickIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            // Setup RemoteViewsService adapter
            val serviceIntent = Intent(context, WidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            views.setRemoteAdapter(R.id.widget_list, serviceIntent)

            // Setup PendingIntentTemplate for list items to trigger ActionReceiver
            val doseIntent = Intent(context, ActionReceiver::class.java).apply {
                action = "com.example.pilllife.TAKE_DOSE"
            }
            val dosePendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                doseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.widget_list, dosePendingIntent)

            try {
                val jsonArray = JSONArray(dataStr)
                if (jsonArray.length() > 0) {
                    views.setViewVisibility(R.id.widget_no_drugs, View.GONE)
                    views.setViewVisibility(R.id.widget_list, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widget_no_drugs, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_list, View.GONE)
                }
            } catch (e: JSONException) {
                views.setViewVisibility(R.id.widget_no_drugs, View.VISIBLE)
                views.setViewVisibility(R.id.widget_list, View.GONE)
            }

            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_list)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
