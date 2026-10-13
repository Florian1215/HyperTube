from django.db import models


class People(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=255)
    profile_path = models.CharField(default=None, null=True)
    department = models.CharField(default=None, null=True)
    birthday = models.CharField(default=None, null=True)
    deathday = models.CharField(default=None, null=True)
    place_of_birth = models.CharField(default=None, null=True)
    # The [type, tmdb_id] of every media of the filmography, whatever the role
    medias = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class PeopleLanguage(models.Model):
    people = models.ForeignKey(People, on_delete=models.CASCADE, related_name='languages')
    lang = models.CharField(max_length=2)
    biography = models.TextField(default='', blank=True)
    # The medias of the filmography for each role, as given by TMDB in this language
    credits = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['people', 'lang'],
                name='unique_people_language',
            )
        ]

    def __str__(self):
        return f'{self.people} - {self.lang}'
