from datetime import datetime, timezone

def get_current_timestamp_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)

def get_one_year_ago_timestamp_ms() -> int:
    now = datetime.now(timezone.utc)
    one_year_ago = now.replace(year=now.year - 1)
    return int(one_year_ago.timestamp() * 1000)
