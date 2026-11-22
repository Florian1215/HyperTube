from django.db.models import Exists, OuterRef, Q

from users.models import User, UserFollow


def history_visible(viewer, user_field=None):
    """Condition on the users whose history the viewer can see: public, their own, or friends' when they follow each other.
    `user_field` is the relation to the user when the query is not on users (e.g. 'user' for UserHistory)."""
    visibility = f'{user_field}__history_visibility' if user_field else 'history_visibility'
    user_id = f'{user_field}_id' if user_field else 'pk'
    condition = Q(**{visibility: User.HISTORY_PUBLIC})
    if viewer is None or not viewer.is_authenticated:
        return condition
    followed_by_viewer = Exists(UserFollow.objects.filter(follower=viewer, followed=OuterRef(user_id)))
    follows_viewer = Exists(UserFollow.objects.filter(follower=OuterRef(user_id), followed=viewer))
    return condition | Q(**{user_id: viewer.id}) | (Q(**{visibility: User.HISTORY_FRIENDS}) & Q(followed_by_viewer) & Q(follows_viewer))


def can_see_history(viewer, user_id):
    return User.objects.filter(pk=user_id).filter(history_visible(viewer)).exists()
