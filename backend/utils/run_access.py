def get_optional_user_from_request(request, verify_token_fn):
    """Return the authenticated User if a valid Bearer token is present, else None."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        token = auth_header.split(' ')[1]
        return verify_token_fn(token)
    except (IndexError, Exception):
        return None


def user_can_view_runs(user):
    """True when the user is verified or an admin."""
    if user is None:
        return False
    return user.is_verified or user.is_admin
