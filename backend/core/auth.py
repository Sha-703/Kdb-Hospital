from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
import logging

logger = logging.getLogger(__name__)


class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """Allow users to authenticate with either username or email.

    If the provided `username` looks like an email or no matching username
    exists, attempt to resolve to a username via email lookup.
    """

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        User = get_user_model()
        # Log the authentication attempt (do NOT log passwords)
        try:
            logger.info("Token obtain attempt: identifier=%s", username)
        except Exception:
            pass

        if username and '@' in username:
            # try to find user by email
            try:
                u = User.objects.filter(email__iexact=username).first()
                if u:
                    attrs['username'] = u.get_username()
                    try:
                        logger.info("Resolved identifier %s to username=%s via email lookup", username, attrs['username'])
                    except Exception:
                        pass
            except Exception:
                pass
        else:
            # if no user with that username exists, try email lookup as fallback
            try:
                if not User.objects.filter(username=username).exists():
                    u = User.objects.filter(email__iexact=username).first()
                    if u:
                        attrs['username'] = u.get_username()
                        try:
                            logger.info("Resolved identifier %s to username=%s via fallback email lookup", username, attrs['username'])
                        except Exception:
                            pass
            except Exception:
                pass
        return super().validate(attrs)

        # call super to perform actual authentication and token creation
        result = super().validate(attrs)
        # log success or failure
        try:
            if getattr(self, 'user', None) is not None:
                logger.info("Token issued for user=%s id=%s", self.user.get_username(), getattr(self.user, 'pk', None))
            else:
                logger.info("Token obtain failed for identifier=%s", username)
        except Exception:
            pass
        return result


class EmailOrUsernameTokenView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenSerializer
