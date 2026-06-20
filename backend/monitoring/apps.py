import os
import threading
import time
from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    name = 'monitoring'

    def ready(self):
        import monitoring.signals  # noqa

        if os.environ.get('RUN_MAIN') != 'true':
            return

        def _run_monitor():
            time.sleep(2)
            from ping3 import ping
            from django.utils import timezone as djtime
            from datetime import timedelta
            from monitoring.models import Router, Incident, HourlyStats
            from monitoring.buffer import buffer

            LOOP_SLEEP = 1

            last_pinged = {}
            router_state = {}
            sla_counter = {}
            sla_active = {}
            hourly_buffer = {}
            last_hourly_flush = time.time()

            while True:
                routers = Router.objects.filter(is_active=True)
                now = time.time()

                for r in routers:
                    interval = max(2, r.ping_interval)
                    threshold = r.anomaly_threshold
                    sla_pings = max(2, r.sla_pings)

                    if r.id in last_pinged and (now - last_pinged[r.id]) < interval:
                        continue

                    res = ping(r.ip_address)
                    last_pinged[r.id] = now

                    if res is None or res is False:
                        latency = 0
                        packet_loss = 100.0
                        anomaly = True
                    else:
                        latency = res * 1000
                        packet_loss = 0.0
                        anomaly = latency > threshold

                    if r.id not in hourly_buffer:
                        hourly_buffer[r.id] = {'pings': [], 'downtime': 0, 'router': r}
                    hourly_buffer[r.id]['pings'].append({
                        'latency': latency, 'packet_loss': packet_loss, 'anomaly': anomaly,
                    })
                    if packet_loss == 100:
                        hourly_buffer[r.id]['downtime'] += interval

                    prev = router_state.get(r.id)

                    if prev is None and anomaly is True:
                        Incident.objects.create(
                            router=r, type='down', started_at=djtime.now(),
                            detail=f'Latencia: {latency:.1f}ms, Perdida: {packet_loss}%',
                        )
                        print(f'[INCIDENTE] {r.hostname} CAIDA (detectado al iniciar)')
                    elif prev is False and anomaly is True:
                        Incident.objects.create(
                            router=r, type='down', started_at=djtime.now(),
                            detail=f'Latencia: {latency:.1f}ms, Perdida: {packet_loss}%',
                        )
                        print(f'[INCIDENTE] {r.hostname} CAIDA')
                    elif prev is True and anomaly is False:
                        last_inc = Incident.objects.filter(
                            router=r, ended_at__isnull=True
                        ).order_by('-started_at').first()
                        if last_inc:
                            recovery_time = djtime.now()
                            delta = (recovery_time - last_inc.started_at).total_seconds()
                            dur = f'{int(delta)}s' if delta < 60 else f'{int(delta / 60)}m' if delta < 3600 else f'{delta / 3600:.1f}h'
                            last_inc.ended_at = recovery_time
                            last_inc.duration = dur
                            last_inc.save(update_fields=['ended_at', 'duration'])
                            rec_type = 'recovery' if last_inc.type == 'down' else 'sla_ok'
                            Incident.objects.create(
                                router=r, type=rec_type, started_at=recovery_time,
                                duration=dur, detail=f'Recuperado tras {dur}',
                            )
                        print(f'[INCIDENTE] {r.hostname} RECUPERADO')
                        sla_counter[r.id] = 0
                        sla_active[r.id] = False

                    if anomaly and not (res is None or res is False):
                        sla_counter[r.id] = sla_counter.get(r.id, 0) + 1
                        if sla_counter[r.id] >= sla_pings and not sla_active.get(r.id):
                            sla_active[r.id] = True
                            Incident.objects.create(
                                router=r, type='sla', started_at=djtime.now(),
                                detail=f'{sla_pings} pings consecutivos con latencia >{threshold}ms',
                            )
                            print(f'[SLA] {r.hostname} ALERTA - latencia sostenida alta')
                    else:
                        if anomaly is False:
                            sla_counter[r.id] = 0
                            if sla_active.get(r.id):
                                sla_active[r.id] = False

                    router_state[r.id] = anomaly
                    buffer.add(r, latency, packet_loss, anomaly)

                if now - last_hourly_flush >= 60:
                    hour_start = djtime.now().replace(minute=0, second=0, microsecond=0)
                    for rid, data in hourly_buffer.items():
                        pings = data['pings']
                        if pings:
                            latencies = [p['latency'] for p in pings if p['latency'] > 0]
                            HourlyStats.objects.update_or_create(
                                router_id=rid, hour=hour_start,
                                defaults={
                                    'avg_latency': round(sum(latencies) / len(latencies), 2) if latencies else 0,
                                    'max_latency': max(latencies) if latencies else 0,
                                    'min_latency': min(latencies) if latencies else 0,
                                    'packet_loss_pct': round(sum(1 for p in pings if p['packet_loss'] > 0) / len(pings) * 100, 1) if pings else 0,
                                    'pings_total': len(pings),
                                    'anomalies': sum(1 for p in pings if p['anomaly']),
                                    'downtime_seconds': data['downtime'],
                                },
                            )
                    hourly_buffer.clear()
                    last_hourly_flush = now

                time.sleep(LOOP_SLEEP)

        thread = threading.Thread(target=_run_monitor, daemon=True)
        thread.start()
