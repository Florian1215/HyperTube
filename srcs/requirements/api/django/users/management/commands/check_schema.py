from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    """
    Compares the models with the tables of the database and creates what is missing with --fix.
    For a database migrated before the migrations were regenerated: Django sees the new 0001_initial as applied,
    so migrate never creates the models added since (TvLogin, TvDevice, DownloadMedia.size...)
    """
    help = 'Lists the tables and columns of the models missing in the database, --fix creates them'

    def add_arguments(self, parser):
        parser.add_argument('--fix', action='store_true', help='Create the missing tables and columns')

    def handle(self, *args, fix=False, **options):
        missing_models, missing_fields = self.missing()
        if not missing_models and not missing_fields:
            self.stdout.write(self.style.SUCCESS('The database matches the models.'))
            return

        for model in missing_models:
            self.stdout.write(f'Missing table {model._meta.db_table} ({model._meta.label})')
        for model, field in missing_fields:
            self.stdout.write(f'Missing column {model._meta.db_table}.{field.column} ({model._meta.label}.{field.name})')
        if not fix:
            self.stdout.write('Run again with --fix to create them.')
            return

        # Foreign keys and indexes are created at the end of the block, once every table exists
        with connection.schema_editor() as editor:
            for model in missing_models:
                editor.create_model(model)
            for model, field in missing_fields:
                editor.add_field(model, field)
        self.stdout.write(self.style.SUCCESS(f'Created {len(missing_models)} table(s) and {len(missing_fields)} column(s).'))

    @staticmethod
    def missing():
        with connection.cursor() as cursor:
            tables = set(connection.introspection.table_names(cursor))
        missing_models, missing_fields = [], []

        for model in apps.get_models(include_auto_created=True):
            meta = model._meta
            if not meta.managed or meta.proxy:
                continue
            if meta.db_table not in tables:
                # The table of a many to many is created with the model that declares it
                owner = getattr(meta, 'auto_created', None)
                if not owner or owner._meta.db_table in tables:
                    missing_models.append(model)
                continue
            with connection.cursor() as cursor:
                columns = {column.name for column in connection.introspection.get_table_description(cursor, meta.db_table)}
            missing_fields += [(model, field) for field in meta.local_fields if field.column and field.column not in columns]
        return missing_models, missing_fields
