from django.db import models

class Router(models.Model):
    hostname = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField()
    is_active = models.BooleanField(default=True)
    ping_interval = models.IntegerField(default=5, help_text='Segundos entre pings (minimo 2)')
    anomaly_threshold = models.IntegerField(default=100, help_text='Latencia en ms para marcar anomalia')
    sla_pings = models.IntegerField(default=3, help_text='Pings consecutivos con latencia alta para alerta SLA')
    group = models.CharField(max_length=50, blank=True, default='', help_text='Grupo: Core, Sucursal, etc.')

    def __str__(self):
        return f"{self.hostname} ({self.ip_address})"


class Incident(models.Model):
    class EventType(models.TextChoices):
        DOWN = 'down', 'Caida'
        RECOVERY = 'recovery', 'Recuperacion'
        SLA = 'sla', 'Alerta SLA'
        SLA_RECOVERY = 'sla_ok', 'SLA Recuperado'

    router = models.ForeignKey(Router, on_delete=models.CASCADE)
    type = models.CharField(max_length=10, choices=EventType.choices)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.CharField(max_length=20, blank=True)
    detail = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.router.hostname} - {self.get_type_display()} ({self.started_at:%H:%M})"


class HourlyStats(models.Model):
    router = models.ForeignKey(Router, on_delete=models.CASCADE)
    hour = models.DateTimeField()
    avg_latency = models.FloatField(default=0)
    max_latency = models.FloatField(default=0)
    min_latency = models.FloatField(default=0)
    packet_loss_pct = models.FloatField(default=0)
    pings_total = models.IntegerField(default=0)
    anomalies = models.IntegerField(default=0)
    downtime_seconds = models.IntegerField(default=0)

    class Meta:
        unique_together = ('router', 'hour')
        ordering = ['-hour']

    def __str__(self):
        return f"{self.router.hostname} - {self.hour:%Y-%m-%d %H:00}"