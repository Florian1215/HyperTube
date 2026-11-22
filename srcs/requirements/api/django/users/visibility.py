from django.db.models import Exists, OuterRef, Q

from users.models import User, UserBlock, UserFollow


def history_visible(viewer, user_field=None):
    """Condition on the users whose history the viewer can see: public, their own, or friends' when they follow each other,
    never the ones who blocked the viewer.
    `user_field` is the relation to the user when the query is not on users (e.g. 'user' for UserHistory)."""
    visibility = f'{user_field}__history_visibility' if user_field else 'history_visibility'
    user_id = f'{user_field}_id' if user_field else 'pk'
    condition = Q(**{visibility: User.HISTORY_PUBLIC})
    if viewer is None or not viewer.is_authenticated:
        return condition
    followed_by_viewer = Exists(UserFollow.objects.filter(follower=viewer, followed=OuterRef(user_id)))
    follows_viewer = Exists(UserFollow.objects.filter(follower=OuterRef(user_id), followed=viewer))
    friends = Q(**{visibility: User.HISTORY_FRIENDS}) & Q(followed_by_viewer) & Q(follows_viewer)
    return ((condition | friends) & ~Q(blocked_viewer(viewer, user_id))) | Q(**{user_id: viewer.id})


def blocked_viewer(viewer, user_id='pk'):
    """The user at `user_id` blocked the viewer: the viewer can't see their profile anymore."""
    return Exists(UserBlock.objects.filter(blocker=OuterRef(user_id), blocked=viewer))


def can_see_history(viewer, user_id):
    return User.objects.filter(pk=user_id).filter(history_visible(viewer)).exists()
