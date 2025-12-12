# Auth module for QuranTrack
from .routes import router as auth_router
from .dependencies import get_current_user, get_current_verified_user

__all__ = ['auth_router', 'get_current_user', 'get_current_verified_user']
