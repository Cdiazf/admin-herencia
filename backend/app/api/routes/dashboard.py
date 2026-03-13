from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import CollectionDashboardResponse, InitialDashboardResponse
from app.services.dashboard import get_collection_dashboard, get_initial_dashboard


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/collections", response_model=CollectionDashboardResponse)
def collection_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CollectionDashboardResponse:
    return get_collection_dashboard(db)


@router.get("/initials", response_model=InitialDashboardResponse)
def initials_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InitialDashboardResponse:
    return get_initial_dashboard(db)
