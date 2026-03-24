from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import AppSetting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def list_settings(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> list[dict[str, str]]:
    settings = db.query(AppSetting).filter(AppSetting.owner_id == owner_id).all()
    return [{"key": item.key, "value": item.value} for item in settings]


@router.put("/{key}")
def upsert_setting(key: str, value: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> dict[str, str]:
    setting = db.query(AppSetting).filter(AppSetting.owner_id == owner_id, AppSetting.key == key).one_or_none()
    if setting is None:
        setting = AppSetting(owner_id=owner_id, key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    return {"key": key, "value": value}
