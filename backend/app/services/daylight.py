from datetime import datetime, timezone
import math
from astral import LocationInfo
from astral.sun import sun
from app.core.config import settings

def calculate_daylight(lat: float = None, lon: float = None) -> dict:
    """
    Calculates sunset and daylight remaining minutes based on geolocation.
    Falls back to settings.DEFAULT_LAT/LON if not provided.
    """
    latitude = lat if lat is not None else settings.DEFAULT_LAT
    longitude = lon if lon is not None else settings.DEFAULT_LON

    now_utc = datetime.now(timezone.utc)
    
    city = LocationInfo("Location", "Region", "UTC", latitude, longitude)
    s = sun(city.observer, date=now_utc.date())

    sunset_utc = s['sunset']
    
    # Calculate difference in minutes
    diff_seconds = (sunset_utc - now_utc).total_seconds()
    minutes_remaining = int(math.floor(diff_seconds / 60))

    if minutes_remaining > 60:
        status = "Broad daylight"
        is_golden_hour = False
        recommended = 45
    elif 0 < minutes_remaining <= 60:
        status = "Golden hour — fading light"
        is_golden_hour = True
        recommended = max(15, minutes_remaining - 5)
    else:
        status = "After dusk / Nightfall"
        is_golden_hour = False
        recommended = 30  # Night stride

    return {
        "sunset": sunset_utc.isoformat(),
        "minutes_remaining": max(0, minutes_remaining),
        "is_golden_hour": is_golden_hour,
        "status": status,
        "recommended_duration_min": recommended
    }
