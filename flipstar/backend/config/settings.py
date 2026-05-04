import os
import mimetypes
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-key')
DEBUG = config('DEBUG', default=False, cast=bool)

# Render-specific ALLOWED_HOSTS fallback
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')
if 'postworq.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('postworq.onrender.com')
if '.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.onrender.com')
if 'localhost' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('localhost')
if '127.0.0.1' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('127.0.0.1')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',  # Django Channels for real-time WebSocket
    'django_celery_beat',  # Celery beat for scheduled tasks
    'api',
]

# Celery Configuration
CELERY_BROKER_URL = f"redis://{config('REDIS_HOST', default='127.0.0.1')}:{config('REDIS_PORT', default=6379)}/0"
CELERY_RESULT_BACKEND = f"redis://{config('REDIS_HOST', default='127.0.0.1')}:{config('REDIS_PORT', default=6379)}/0"
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# CORS settings
CORS_ALLOWED_ORIGINS = [
    'https://postworqq.vercel.app',
    'https://postworq.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
]
CORS_ALLOW_ALL_ORIGINS = True  # Fallback to allow all origins

MIDDLEWARE = [
    'api.middleware.CustomCorsMiddleware',  # Custom CORS for Vercel - handles all origins
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.VideoStreamingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'api', 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Django Channels configuration for Redis channel layer
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(config('REDIS_HOST', default='127.0.0.1'), int(config('REDIS_PORT', default=6379)))],
        },
    },
}

# Auto-detect Render environment (RENDER env var is set automatically by Render)
IS_RENDER = config('RENDER', default=False, cast=bool) or os.environ.get('RENDER', False)

# Database configuration
if IS_RENDER:
    # Render deployment: Use Neon database
    # Check for multiple possible environment variable names
    database_url = (config('DATABASE_URL', default=None) or
                    config('POSTGRES_URL', default=None) or
                    config('POSTGRESQL_URL', default=None) or
                    os.environ.get('DATABASE_URL') or
                    os.environ.get('POSTGRES_URL') or
                    os.environ.get('POSTGRESQL_URL'))

    if database_url:
        # Parse DATABASE_URL
        import urllib.parse
        parsed = urllib.parse.urlparse(database_url)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': parsed.path.lstrip('/'),
                'USER': parsed.username,
                'PASSWORD': parsed.password,
                'HOST': parsed.hostname,
                'PORT': parsed.port or 5432,
                'OPTIONS': {
                    'sslmode': 'require',
                },
                'CONN_MAX_AGE': 0,
            }
        }
        print(f"=== USING DATABASE_URL ===")
        print(f"DATABASE_HOST: {parsed.hostname}")
        print(f"DATABASE_NAME: {parsed.path.lstrip('/')}")
    else:
        # Fallback to individual environment variables
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': config('DB_NAME', default='neondb'),
                'USER': config('DB_USER', default='neondb_owner'),
                'PASSWORD': config('DB_PASSWORD', default='your-db-password-here'),
                'HOST': config('DB_HOST', default='your-db-host-here'),
                'PORT': config('DB_PORT', default='5432'),
                'OPTIONS': {
                    'sslmode': 'require',
                    'connect_timeout': 10,
                },
                'CONN_MAX_AGE': 0,
            }
        }
        print(f"=== USING INDIVIDUAL ENV VARS ===")
        print(f"DATABASE_HOST: {DATABASES['default']['HOST']}")

    # Debug: Print database configuration (remove in production)
    print(f"=== NEW DEPLOYMENT DETECTED ===")
    print(f"DATABASE_HOST: {DATABASES['default']['HOST']}")
    print(f"DATABASE_NAME: {DATABASES['default']['NAME']}")
    print(f"DATABASE_USER: {DATABASES['default']['USER']}")
    print(f"=== DEPLOYMENT VERSION: 3.0 ===")

    # Test database connection and handle errors gracefully
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("=== DATABASE CONNECTION SUCCESSFUL ===")
    except Exception as e:
        print(f"=== DATABASE CONNECTION FAILED: {e} ===")
        print("=== FALLBACK TO SQLITE FOR CRITICAL OPERATIONS ===")
        # Fallback to SQLite for basic functionality
        DATABASES['default'] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(BASE_DIR / 'fallback_db.sqlite3'),
        }
else:
    # Local / Docker development
    _db_engine = config('DB_ENGINE', default='django.db.backends.sqlite3')
    if _db_engine == 'django.db.backends.postgresql':
        DATABASES = {
            'default': {
                'ENGINE': _db_engine,
                'NAME': config('DB_NAME', default='flipstar_db'),
                'USER': config('DB_USER', default='flipstar_user'),
                'PASSWORD': config('DB_PASSWORD', default='changeme'),
                'HOST': config('DB_HOST', default='postgres'),
                'PORT': config('DB_PORT', default='5432'),
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': _db_engine,
                'NAME': config('DB_NAME', default=str(BASE_DIR / 'db.sqlite3')),
            }
        }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# AWS S3 Configuration for media storage
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com' if AWS_STORAGE_BUCKET_NAME else None

# Use S3 for media storage if credentials are provided
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # S3 storage settings
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    
    # Media URL from S3
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
else:
    # Fallback to local storage
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Cloudinary configuration (legacy - will be removed after S3 migration)
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY', default='')
CLOUDINARY_API_SECRET = config('CLOUDINARY_API_SECRET', default='')

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET and not AWS_STORAGE_BUCKET_NAME:
    try:
        import cloudinary
        import cloudinary_storage  # noqa
        CLOUDINARY_STORAGE = {
            'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
            'API_KEY': CLOUDINARY_API_KEY,
            'API_SECRET': CLOUDINARY_API_SECRET,
            'SECURE': True,
        }
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']
        DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    except ImportError:
        pass

# Configure mimetypes for video files
mimetypes.add_type('video/mp4', '.mp4', True)
mimetypes.add_type('video/webm', '.webm', True)
mimetypes.add_type('video/ogg', '.ogv', True)

# Streaming response settings
STREAMING_CONTENT_LENGTH = 4096

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

CORS_ALLOWED_ORIGINS = [
    "https://postworqq.vercel.app",
    "https://postworq.onrender.com", 
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Allow all origins to fix CORS issues
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
]
CORS_EXPOSE_HEADERS = [
    'content-type',
    'x-csrftoken',
]

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
