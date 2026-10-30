"""Gunicorn settings for Cloud Run."""
import os

bind = f":{os.environ.get('PORT', '8080')}"
# Each thread may hold one PostgreSQL connection: workers × threads × max instances must stay
# below the Cloud SQL connection limit (see docs/infraestructura-staging.md).
workers = int(os.environ.get('GUNICORN_WORKERS', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
timeout = 30
# Cloud Run waits 10 seconds after SIGTERM before stopping the container.
graceful_timeout = 8
# Cloud Run already records each request; an access log here would duplicate URLs and addresses.
accesslog = None
errorlog = '-'
# Nobody manages the server from inside the container; the runtime control socket stays off.
control_socket_disable = True
