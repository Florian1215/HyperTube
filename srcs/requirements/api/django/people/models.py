from django.db import models


class People(models.Model):
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    gender = models.CharField(max_length=255)
