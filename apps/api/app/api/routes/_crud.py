from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_owner_id
from app.core.database import get_db
from app.services.crud import CRUDService


def build_crud_router(
    *,
    prefix: str,
    tags: list[str],
    service: CRUDService,
    create_schema,
    update_schema,
    read_schema,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", response_model=list[read_schema])
    def list_items(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
        return service.list(db, owner_id)

    @router.post("", response_model=read_schema, status_code=status.HTTP_201_CREATED)
    def create_item(payload: create_schema, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
        return service.create(db, owner_id, payload)

    @router.get("/{item_id}", response_model=read_schema)
    def get_item(item_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
        item = service.get(db, owner_id, item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return item

    @router.patch("/{item_id}", response_model=read_schema)
    def update_item(
        item_id: str,
        payload: update_schema,
        db: Session = Depends(get_db),
        owner_id: str = Depends(get_owner_id),
    ):
        item = service.update(db, owner_id, item_id, payload)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return item

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_item(item_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
        deleted = service.delete(db, owner_id, item_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        return None

    return router

