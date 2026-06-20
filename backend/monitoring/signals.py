from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Router, Incident


@receiver(post_save, sender=Incident)
def on_incident_created(sender, instance, created, **kwargs):
    if created and instance.type == 'down':
        print(f'[ALERTA] {instance.router.hostname} CAIDA - {instance.detail}')


@receiver(pre_delete, sender=Router)
def on_router_deleted(sender, instance, **kwargs):
    print(f'[INFO] Router eliminado: {instance.hostname} ({instance.ip_address})')
