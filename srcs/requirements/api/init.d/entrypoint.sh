#!/bin/bash
RED="\001\033[031m\002"
BOLD="\001\033[001m\002"
RESET="\001\033[000m\002"


if [[ $MIGRATION = true ]]; then
    echo -e $BOLD$RED"- API migrations processing"$RESET

    echo -e $BOLD$RED"- Making migrations"$RESET
    python manage.py makemigrations
    echo -e $BOLD$RED"- Migrating"$RESET
    python manage.py migrate
fi

exec "$@"