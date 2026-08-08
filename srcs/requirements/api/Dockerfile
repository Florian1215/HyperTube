##### Base build
FROM python:3.13.0-slim AS base

EXPOSE 8000

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y postgresql-client

COPY init.d /init.d

RUN pip install --no-cache-dir -r /init.d/requirements.txt
RUN chmod u+x /init.d/entrypoint.sh

WORKDIR /code

##### Development build
FROM base AS development

RUN apt-get install -y --no-install-recommends curl net-tools

ENTRYPOINT ["/init.d/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

##### Production build
FROM base AS production

COPY django /code

RUN pip install gunicorn gevent

ENTRYPOINT ["/init.d/entrypoint.sh"]
CMD ["gunicorn", "--worker-class", "gevent", "--workers", "4", "--bind", "0.0.0.0:8000", "--timeout", "3600", "config.wsgi:application"]