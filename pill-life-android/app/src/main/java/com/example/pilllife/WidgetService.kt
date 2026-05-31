package com.example.pilllife

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray
import org.json.JSONException

class WidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetDataProvider(this.applicationContext)
    }
}

class WidgetDataProvider(val context: Context) : RemoteViewsService.RemoteViewsFactory {
    private var drugList: JSONArray = JSONArray()

    override fun onCreate() {
        initData()
    }

    override fun onDataSetChanged() {
        initData()
    }

    private fun initData() {
        val prefs = context.getSharedPreferences("PillLifePrefs", Context.MODE_PRIVATE)
        val dataStr = prefs.getString("widget_data", "[]") ?: "[]"
        try {
            drugList = JSONArray(dataStr)
        } catch (e: JSONException) {
            drugList = JSONArray()
        }
    }

    override fun onDestroy() {}

    override fun getCount(): Int {
        return drugList.length()
    }

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_list_item)
        try {
            val obj = drugList.getJSONObject(position)
            val name = obj.getString("name")
            val color = obj.getString("color")
            val level = obj.getString("level")
            val drugId = obj.optString("id", "")
            val doseMg = obj.optDouble("doseMg", 0.0)

            views.setTextViewText(R.id.widget_drug_name, name)
            views.setTextViewText(R.id.widget_drug_level, level)
            try {
                views.setInt(R.id.widget_drug_color, "setColorFilter", Color.parseColor(color))
            } catch (e: Exception) {
                // ignore invalid color
            }

            // Fill in the intent template for the '+' button
            val fillInIntent = Intent().apply {
                putExtra("drugId", drugId)
                putExtra("doseMg", doseMg)
            }
            views.setOnClickFillInIntent(R.id.widget_btn_add_dose, fillInIntent)

        } catch (e: JSONException) {
            e.printStackTrace()
        }
        return views
    }

    override fun getLoadingView(): RemoteViews? {
        return null
    }

    override fun getViewTypeCount(): Int {
        return 1
    }

    override fun getItemId(position: Int): Long {
        return position.toLong()
    }

    override fun hasStableIds(): Boolean {
        return true
    }
}
