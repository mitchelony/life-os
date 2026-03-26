from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import AppSetting
from app.schemas.domain import AppSettingRead, AppSettingWrite, SettingsBootstrapPayload
from app.services.settings_bootstrap import SettingsBootstrapService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=list[AppSettingRead])
def list_settings(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> list[AppSetting]:
    settings = db.query(AppSetting).filter(AppSetting.owner_id == owner_id).all()
    return settings


@router.get("/bootstrap", response_model=SettingsBootstrapPayload)
def get_settings_bootstrap(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> SettingsBootstrapPayload:
    return SettingsBootstrapService(db, owner_id).read()


@router.put("/bootstrap", response_model=SettingsBootstrapPayload)
def put_settings_bootstrap(
    payload: SettingsBootstrapPayload,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> SettingsBootstrapPayload:
    return SettingsBootstrapService(db, owner_id).replace(payload)


@router.put("/{key}", response_model=AppSettingRead)
def upsert_setting(
    key: str,
    payload: AppSettingWrite,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> AppSetting:
    setting = db.query(AppSetting).filter(AppSetting.owner_id == owner_id, AppSetting.key == key).one_or_none()
    if setting is None:
        setting = AppSetting(owner_id=owner_id, key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting
