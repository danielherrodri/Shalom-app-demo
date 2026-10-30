# API de Shalom para Cloud Run. Construir desde backend/: docker build -t shalom-api .
# La imagen base va fijada por digest; actualizarla es un cambio revisado como cualquier dependencia.
FROM python:3.13-slim-trixie@sha256:2d44738ebf4ce5f63b9d9ea871e9c7cfdc0426f7b0c97cac915fd88ded1d86bb

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    SHALOM_ENV=production

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-compile -r requirements.txt \
    && useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin shalom

# Solo el código: .dockerignore deja fuera cachés, bases locales y archivos de entorno.
COPY --chown=root:root . .
USER 10001

# Cloud Run define PORT. Las migraciones corren en un Cloud Run Job con esta misma imagen
# (python manage.py migrate), nunca al arrancar el servicio.
CMD ["gunicorn", "--config", "gunicorn.conf.py", "config.wsgi"]
