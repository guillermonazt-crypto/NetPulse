from django.contrib import admin
from .models import Router, Incident, HourlyStats


@admin.register(Router)
class RouterAdmin(admin.ModelAdmin):
    list_display = ('hostname', 'ip_address', 'group', 'is_active', 'ping_interval', 'anomaly_threshold', 'sla_pings')
    list_filter = ('group', 'is_active')


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('router', 'type', 'started_at', 'ended_at', 'duration')
    list_filter = ('type', 'router')


@admin.register(HourlyStats)
class HourlyStatsAdmin(admin.ModelAdmin):
    list_display = ('router', 'hour', 'avg_latency', 'pings_total', 'anomalies')
    list_filter = ('router',)