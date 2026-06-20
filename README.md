# NetPulse

Sistema de monitoreo de red en tiempo real. Hace ping a tus routers, grafica la latencia, detecta caidas y te avisa cuando algo falla.

## Instalacion

Requiere Python 3.10+ y Node.js LTS.

```bash
git clone https://github.com/guillermonazt-crypto/NetPulse.git
cd NetPulse
```

### Backend

```bash
cd backend
python -m venv env
.\env\Scripts\activate      # Windows
source env/bin/activate     # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

### Frontend

```bash
cd frontend
npm install
```

## Ejecutar

```bash
# Terminal 1 - Backend (el monitor de pings arranca automaticamente)
cd backend
.\env\Scripts\activate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Abre `http://localhost:5173`, inicia sesion y agrega routers desde la seccion de gestion en el menu lateral.

## Funcionalidades

- **Dashboard:** grafica de latencia en tiempo real con una linea por router, estadisticas de uptime, anomalias y latencia promedio. Selector de rango de tiempo.
- **Alertas:** sonido al detectar una caida y al recuperarse. Campana de notificaciones con popover mostrando los routers caidos.
- **Eventos:** tabla con todas las caidas, recuperaciones y alertas SLA. Filtro por tipo. Exportacion a CSV y PDF.
- **SLA:** deteccion de latencia alta sostenida, configurable por router (cuantos pings consecutivos).
- **Gestion de routers:** CRUD completo. Cada router puede tener su propio intervalo de ping, umbral de anomalia, grupo y configuracion de SLA.
- **Historico:** pagina con grafica de disponibilidad (donut), barras de tiempo caido por hora y latencia promedio historica. Datos agregados automaticamente.
- **Modo oscuro** con toggle en el menu lateral.
- **API REST** con autenticacion JWT.
- **Django Admin** en `/admin/`.

## API Endpoints

| Endpoint | Descripcion |
|---|---|
| `POST /api/token/` | Login (JWT) |
| `GET /api/metrics/` | Metricas en tiempo real (buffer 5 min) |
| `GET /api/events/` | Incidentes: caidas, recuperaciones, SLA |
| `GET /api/stats/` | Estadisticas: uptime, latencia prom, anomalias |
| `GET /api/historical/` | Datos agregados por hora |
| `GET /api/routers/` | CRUD de routers |
| `GET /api/health/` | Health check (sin auth) |

## Arquitectura

```
Monitor (background thread)
  ├── Buffer en RAM (ultimos 5 min) → GET /api/metrics/ → Grafica
  ├── Incident (DB) → GET /api/events/ → Tabla de eventos
  └── HourlyStats (DB) → GET /api/historical/ → Pagina de historico
```

El monitor no escribe a la base de datos en cada ping. Solo guarda los incidentes. Las metricas para la grafica se mantienen en un buffer en memoria. Cada hora se agregan los promedios a `HourlyStats` para el historico.
