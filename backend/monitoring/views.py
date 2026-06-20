from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Sum
from datetime import timedelta
from .models import Router, Incident, HourlyStats
from .serializers import RouterSerializer
from .buffer import buffer


@api_view(['GET'])
@permission_classes([AllowAny])
def health_view(request):
    from ping3 import ping
    routers = Router.objects.filter(is_active=True)
    routers_status = []
    for r in routers[:5]:
        res = ping(r.ip_address, timeout=1)
        routers_status.append({
            'hostname': r.hostname,
            'ip': r.ip_address,
            'up': res is not None and res is not False,
            'latency': round(res * 1000, 2) if res and res is not False and res is not True else None,
        })
    return Response({
        'status': 'ok',
        'active_routers': routers.count(),
        'total_incidents': Incident.objects.count(),
        'active_incidents': Incident.objects.filter(type='down', ended_at__isnull=True).count(),
        'routers': routers_status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metrics_view(request):
    router_id = request.query_params.get('router_id')
    hours = request.query_params.get('hours')
    limit = request.query_params.get('limit', 200)
    try:
        limit = int(limit)
    except ValueError:
        limit = 200

    try:
        hours = float(hours) if hours else None
    except ValueError:
        hours = None

    return Response(buffer.get_recent(router_id=router_id, hours=hours, limit=limit))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_view(request):
    active = Router.objects.filter(is_active=True).count()
    total = Router.objects.count()

    hours = request.query_params.get('hours', 24)
    try:
        hours = float(hours)
    except ValueError:
        hours = 24

    cutoff = timezone.now() - timedelta(hours=hours)
    anomalies = Incident.objects.filter(started_at__gte=cutoff, type='down').count()
    losses = Incident.objects.filter(started_at__gte=cutoff, type='down').count()

    down_events = Incident.objects.filter(started_at__gte=cutoff, type='down').exclude(ended_at__isnull=True)
    total_downtime = timedelta()
    for ev in down_events:
        if ev.ended_at:
            total_downtime += ev.ended_at - ev.started_at
    active_now = Incident.objects.filter(type='down', ended_at__isnull=True)
    for ev in active_now:
        total_downtime += timezone.now() - ev.started_at

    total_seconds = hours * 3600
    downtime_seconds = min(total_downtime.total_seconds(), total_seconds)
    uptime = round((1 - downtime_seconds / (total_seconds * max(active, 1))) * 100, 1)

    buf_stats = buffer.stats(hours=min(hours, 1))

    return Response({
        'active_routers': active,
        'total_routers': total,
        'avg_latency': buf_stats['avg_latency'],
        'anomaly_count': anomalies,
        'loss_count': losses,
        'uptime': uptime,
        'total_metrics': buf_stats['total_metrics'],
        'hours': hours,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def events_view(request):
    hours = request.query_params.get('hours', 24)
    try:
        hours = float(hours)
    except ValueError:
        hours = 24

    cutoff = timezone.now() - timedelta(hours=hours)
    incidents = Incident.objects.filter(
        Q(started_at__gte=cutoff) | Q(type='down', ended_at__isnull=True)
    )

    router_id = request.query_params.get('router_id')
    if router_id:
        incidents = incidents.filter(router_id=router_id)

    incidents = incidents.select_related('router').distinct()

    data = []
    for inc in incidents:
        data.append({
            'id': inc.id,
            'router_name': inc.router.hostname,
            'router_id': inc.router_id,
            'type': inc.type,
            'started_at': inc.started_at,
            'ended_at': inc.ended_at,
            'duration': inc.duration,
            'detail': inc.detail,
        })

    return Response(data)


class RouterViewSet(viewsets.ModelViewSet):
    queryset = Router.objects.all()
    serializer_class = RouterSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historical_view(request):
    hours = request.query_params.get('hours', 168)
    try:
        hours = int(hours)
    except ValueError:
        hours = 168

    router_id = request.query_params.get('router_id')
    cutoff = timezone.now() - timedelta(hours=hours)
    qs = HourlyStats.objects.filter(hour__gte=cutoff).select_related('router')
    if router_id:
        qs = qs.filter(router_id=router_id)

    data = []
    for s in qs.order_by('hour'):
        data.append({
            'router_name': s.router.hostname,
            'router_id': s.router_id,
            'hour': s.hour,
            'avg_latency': s.avg_latency,
            'max_latency': s.max_latency,
            'min_latency': s.min_latency,
            'packet_loss_pct': s.packet_loss_pct,
            'pings_total': s.pings_total,
            'anomalies': s.anomalies,
            'downtime_seconds': s.downtime_seconds,
        })
    return Response(data)
