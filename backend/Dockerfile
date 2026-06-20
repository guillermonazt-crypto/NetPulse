FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=core.settings
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD python manage.py migrate && python manage.py runserver 0.0.0.0:8000
