"""One readable message per validation error, so the interface can show the server's own words."""
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def first_message(value):
    while isinstance(value, (list, dict)) and value:
        value = value[0] if isinstance(value, list) else next(iter(value.values()))
    return str(value) if value else ''


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if isinstance(exc, ValidationError) and response is not None and isinstance(response.data, dict):
        detail = response.data.get('detail', response.data)
        response.data = {**response.data, 'detail': first_message(detail)}
    return response
