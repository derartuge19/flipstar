from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.utils import timezone
from django.db import DatabaseError
from .models import Comment, CommentLike, CommentReply, SavedPost, Reel, UserProfile
from .serializers_extended import CommentSerializer, CommentLikeSerializer, CommentReplySerializer, SavedPostSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'like', 'reply']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        try:
            queryset = Comment.objects.all()
            reel_id = self.request.query_params.get('reel')
            if reel_id:
                queryset = queryset.filter(reel_id=reel_id)
            return queryset
        except DatabaseError as e:
            # Handle missing database columns gracefully
            if 'does not exist' in str(e) or 'column' in str(e).lower():
                # Return empty queryset if database schema is not updated
                return Comment.objects.none()
            raise
    
    def perform_create(self, serializer):
        try:
            serializer.save(user=self.request.user)
        except DatabaseError as e:
            if 'does not exist' in str(e) or 'column' in str(e).lower():
                # Handle missing fields by setting default values
                serializer.save(user=self.request.user, edited_at=None, is_deleted=False)
            else:
                raise
    
    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        # Only allow editing own comments
        if comment.user != request.user:
            return Response({'error': 'You can only edit your own comments'}, status=status.HTTP_403_FORBIDDEN)
        # Only allow editing within 15 minutes
        try:
            if not comment.is_editable:
                return Response({'error': 'Edit window has expired (15 minutes)'}, status=status.HTTP_400_BAD_REQUEST)
        except DatabaseError:
            # If is_editable property fails due to missing fields, allow editing
            pass
        
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment.text = text
        try:
            comment.edited_at = timezone.now()
        except DatabaseError:
            # If edited_at field doesn't exist, skip it
            pass
        comment.save()
        
        serializer = self.get_serializer(comment)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        # Only allow deleting own comments
        if comment.user != request.user:
            return Response({'error': 'You can only delete your own comments'}, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        try:
            comment.is_deleted = True
        except DatabaseError:
            # If is_deleted field doesn't exist, hard delete
            comment.delete()
            return Response({'ok': True})
        comment.text = ''
        comment.save()
        return Response({'ok': True})
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        comment = self.get_object()
        like, created = CommentLike.objects.get_or_create(
            user=request.user,
            comment=comment
        )
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': comment.likes_count})
        return Response({'liked': True, 'likes_count': comment.likes_count})
    
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        comment = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            reply = CommentReply.objects.create(
                user=request.user,
                comment=comment,
                text=text
            )
        except DatabaseError as e:
            if 'does not exist' in str(e) or 'column' in str(e).lower():
                # Handle missing fields by setting default values
                reply = CommentReply.objects.create(
                    user=request.user,
                    comment=comment,
                    text=text,
                    edited_at=None,
                    is_deleted=False
                )
            else:
                raise
        serializer = CommentReplySerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CommentReplyViewSet(viewsets.ModelViewSet):
    queryset = CommentReply.objects.all()
    serializer_class = CommentReplySerializer
    permission_classes = [AllowAny]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'like']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        reply = self.get_object()
        # Only allow editing own replies
        if reply.user != request.user:
            return Response({'error': 'You can only edit your own replies'}, status=status.HTTP_403_FORBIDDEN)
        # Only allow editing within 15 minutes
        if not reply.is_editable:
            return Response({'error': 'Edit window has expired (15 minutes)'}, status=status.HTTP_400_BAD_REQUEST)
        
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reply.text = text
        reply.edited_at = timezone.now()
        reply.save()
        
        serializer = self.get_serializer(reply)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        reply = self.get_object()
        # Only allow deleting own replies
        if reply.user != request.user:
            return Response({'error': 'You can only delete your own replies'}, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        reply.is_deleted = True
        reply.text = ''
        reply.save()
        return Response({'ok': True})
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        reply = self.get_object()
        like, created = CommentLike.objects.get_or_create(
            user=request.user,
            reply=reply
        )
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': reply.likes_count})
        return Response({'liked': True, 'likes_count': reply.likes_count})

class SavedPostViewSet(viewsets.ModelViewSet):
    serializer_class = SavedPostSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SavedPost.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        reel_id = request.data.get('reel_id')
        if not reel_id:
            return Response({'error': 'reel_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        reel = get_object_or_404(Reel, id=reel_id)
        saved, created = SavedPost.objects.get_or_create(
            user=request.user,
            reel=reel
        )
        
        if not created:
            saved.delete()
            return Response({'saved': False})
        return Response({'saved': True})

class ProfilePhotoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        profile = request.user.profile
        photo = request.FILES.get('photo')
        
        if not photo:
            return Response({'error': 'Photo is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        profile.profile_photo = photo
        profile.save()
        
        return Response({
            'profile_photo': profile.profile_photo.url if profile.profile_photo else None
        })
