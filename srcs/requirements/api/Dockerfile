##### Base build
FROM python:3.13.0-slim AS base

EXPOSE 8000

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y postgresql-client
RUN apt-get install -y --no-install-recommends ffmpeg

COPY init.d /init.d

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /init.d/requirements.txt
RUN chmod 755 /init.d/entrypoint.sh

# Run as the host user so files written to the bind mounts (medias/, media/)
# stay owned by that user and can be deleted without sudo
ARG UID=1000
ARG GID=1000
RUN groupadd -o -g ${GID} app \
    && useradd -o -m -u ${UID} -g ${GID} app \
    && mkdir -p /code /stream /staticfiles \
    && chown app:app /code /stream /staticfiles

WORKDIR /code

##### Development build
FROM base AS development

RUN apt-get install -y --no-install-recommends curl net-tools

USER app

ENTRYPOINT ["/init.d/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

##### Production build
FROM base AS production

RUN pip install gunicorn gevent

COPY --chown=app:app django /code

USER app

ENTRYPOINT ["/init.d/entrypoint.sh"]
CMD ["gunicorn", "--worker-class", "gevent", "--workers", "4", "--bind", "0.0.0.0:8000", "--timeout", "3600", "config.wsgi:application"]