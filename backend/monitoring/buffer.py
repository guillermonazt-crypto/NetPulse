import time
import threading

class MetricsBuffer:
    """Buffer en memoria para metricas recientes. Thread-safe."""

    def __init__(self, max_age_seconds=300):
        self._lock = threading.Lock()
        self._data = []
        self._max_age = max_age_seconds
        self._id_counter = 0

    def add(self, router, latency, packet_loss, is_anomaly):
        with self._lock:
            self._id_counter += 1
            self._data.append({
                'id': self._id_counter,
                'router': router.id,
                'router_name': router.hostname,
                'latency': latency,
                'packet_loss': packet_loss,
                'is_anomaly': is_anomaly,
                'created_at': time.time(),
            })

    def get_recent(self, router_id=None, hours=None, limit=200):
        with self._lock:
            now = time.time()
            cutoff = now - self._max_age
            if hours:
                cutoff = now - (hours * 3600)

            self._data = [m for m in self._data if m['created_at'] >= cutoff]

            result = self._data
            if router_id:
                result = [m for m in result if m['router'] == int(router_id)]

            from datetime import datetime, timezone
            return [
                {**m, 'created_at': datetime.fromtimestamp(m['created_at'], tz=timezone.utc).isoformat()}
                for m in result[-limit:]
            ][::-1]

    def stats(self, hours=24):
        with self._lock:
            now = time.time()
            cutoff = now - (hours * 3600)
            recent = [m for m in self._data if m['created_at'] >= cutoff]
            latencies = [m['latency'] for m in recent if m['latency'] > 0]
            return {
                'avg_latency': round(sum(latencies) / len(latencies), 2) if latencies else 0,
                'total_metrics': len(recent),
            }

    def clear(self):
        with self._lock:
            self._data.clear()


buffer = MetricsBuffer(max_age_seconds=300)
