"""Configuration for the CallDeck research worker."""

import os

CALLDECK_URL = os.getenv("CALLDECK_URL", "https://calldeck.thegeshwar.com")
CALLDECK_WORKER_KEY = os.getenv("CALLDECK_WORKER_KEY", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://api.qms.thegeshwar.com")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

PHASE_TIMEOUT = int(os.getenv("PHASE_TIMEOUT", "120"))
TOTAL_TIMEOUT = int(os.getenv("TOTAL_TIMEOUT", "300"))

LINKEDIN_CHROME_PROFILE = "Profile 2"  # thejeshwa@gmail.com

WORKER_ID = os.getenv("WORKER_ID", "mac-1")
