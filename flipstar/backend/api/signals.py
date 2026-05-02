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
