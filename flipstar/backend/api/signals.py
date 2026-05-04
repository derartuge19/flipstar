from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import UserProfile, Subscription, NotificationPreference, Notification, Vote, Comment, Follow

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
        Subscription.objects.create(user=instance)
        NotificationPreference.objects.create(user=instance)
        Token.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

@receiver(post_save, sender=Vote)
def create_like_notification(sender, instance, created, **kwargs):
    """Create notification when someone likes a reel"""
    if created and instance.user != instance.reel.user:
        Notification.objects.create(
            recipient=instance.reel.user,
            sender=instance.user,
            notification_type='like',
            reel=instance.reel,
            message=f"{instance.user.username} liked your reel"
        )

@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Create notification when someone comments on a reel"""
    try:
        if created and instance.user != instance.reel.user:
            Notification.objects.create(
                recipient=instance.reel.user,
                sender=instance.user,
                notification_type='comment',
                reel=instance.reel,
                comment=instance,
                message=f"{instance.user.username} commented on your reel: {instance.text[:50]}"
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to create comment notification: {e}")

@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    """Create notification when someone follows a user"""
    if created:
        Notification.objects.create(
            recipient=instance.following,
            sender=instance.follower,
            notification_type='follow',
            message=f"{instance.follower.username} started following you"
        )

@receiver(post_delete, sender=Vote)
def delete_like_notification(sender, instance, **kwargs):
    """Delete notification when someone unlikes a reel"""
    Notification.objects.filter(
        sender=instance.user,
        recipient=instance.reel.user,
        notification_type='like',
        reel=instance.reel
    ).delete()


@receiver(post_save, sender=Notification)
def push_notification_on_create(sender, instance, created, **kwargs):
    """Send FCM push notification when a new Notification row is created."""
    if not created:
        return
    try:
        from api.tasks import send_push_notification
        type_titles = {
            'like': 'New Like',
            'comment': 'New Comment',
            'follow': 'New Follower',
            'gift': 'You received a gift!',
        }
        send_push_notification.delay(
            instance.recipient_id,
            {
                'title': type_titles.get(instance.notification_type, 'FlipStar'),
                'body': instance.message,
                'data': {'notification_type': instance.notification_type},
            }
        )
    except Exception:
        pass


@receiver(post_save, sender=UserProfile)
def optimize_profile_photo_on_save(sender, instance, **kwargs):
    """Queue profile photo optimisation whenever it changes."""
    if instance.profile_photo and not str(instance.profile_photo).startswith('http'):
        try:
            from api.tasks import optimize_profile_image
            optimize_profile_image.delay(instance.user_id)
        except Exception:
            pass
