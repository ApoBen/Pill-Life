package com.example.pilllife

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class NotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("title") ?: "Pill-Life"
        val body = intent.getStringExtra("body") ?: "İlaç saatiniz geldi!"
        val idStr = intent.getStringExtra("id") ?: ""
        val notificationId = idStr.hashCode()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "pill_life_notifications"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Pill-Life Bildirimleri",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "İlaç pik seviye bildirimleri"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val drugId = intent.getStringExtra("drugId") ?: ""
        val doseMg = intent.getDoubleExtra("doseMg", 0.0)

        val clickIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        if (drugId.isNotEmpty() && doseMg > 0.0) {
            val actionIntent = Intent(context, ActionReceiver::class.java).apply {
                action = "com.example.pilllife.TAKE_DOSE"
                putExtra("drugId", drugId)
                putExtra("doseMg", doseMg)
                putExtra("notificationId", notificationId)
            }
            val actionPendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId + 1,
                actionIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(R.drawable.ic_check, "Aldım", actionPendingIntent)
        }

        notificationManager.notify(notificationId, builder.build())
    }
}
