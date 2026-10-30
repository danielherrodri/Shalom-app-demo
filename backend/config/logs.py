"""Structured logs for Cloud Logging that leave out request data and exception messages."""
import json
import logging
import traceback

# Extra fields a log call may attach; anything else (request objects, bodies, headers) is dropped.
ALLOWED_FIELDS = ('email_id', 'kind', 'attempt', 'status_code')


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {'severity': record.levelname, 'logger': record.name, 'message': record.getMessage()}
        entry.update({field: getattr(record, field) for field in ALLOWED_FIELDS if hasattr(record, field)})
        if record.exc_info and record.exc_info[0]:
            kind, _, trace = record.exc_info
            # Frames and the exception type only: messages can quote values such as a duplicated email.
            name = f'{kind.__module__}.{kind.__qualname__}'
            entry['error'] = name
            entry['stack_trace'] = 'Traceback (most recent call last):\n' + ''.join(traceback.format_tb(trace)) + name
        return json.dumps(entry, ensure_ascii=False, default=str)
