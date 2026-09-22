from datetime import datetime
from zoneinfo import ZoneInfo

# Runs are scheduled in local Philadelphia time
APP_TIMEZONE = ZoneInfo('America/New_York')


def local_now():
    """Current time where the runs happen."""
    return datetime.now(APP_TIMEZONE)


def local_today():
    """Today's date where the runs happen.

    Servers run in UTC, so date.today() rolls over at 8pm local and would push
    evening runs into the past.
    """
    return local_now().date()
