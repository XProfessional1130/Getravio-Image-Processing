from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication without CSRF check for API endpoints.

    This is safe because:
    1. We use CORS to restrict origins
    2. Credentials (cookies) only sent to allowed origins
    3. Phase 0 development setup

    In production, consider using Token/JWT authentication instead.
    """

    def enforce_csrf(self, request):
        # Skip CSRF check for API endpoints
        return
