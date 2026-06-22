from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class EventEnvelope(BaseModel):
    """Standard event envelope for all Bank Simulator events."""
    event_id: str
    event_type: str
    user_id: str
    account_id: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}
    timestamp: datetime
    source: str = "bank_simulator"
    version: str = "1.0"
