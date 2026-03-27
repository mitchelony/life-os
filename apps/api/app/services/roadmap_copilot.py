from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from app.models.domain import PlannerDraft
from app.schemas.domain import (
    QuickAddRequest,
    RoadmapCopilotApproveResponse,
    RoadmapCopilotCurrentResponse,
    RoadmapCopilotDenyResponse,
    RoadmapCopilotDraftResponse,
    RoadmapCopilotEmergencyExpenseRequest,
    RoadmapCopilotEmergencyExpenseResponse,
    RoadmapCopilotPreview,
    RoadmapCopilotPreviewAction,
    RoadmapCopilotPreviewGoal,
    RoadmapCopilotPreviewIncomePlan,
    RoadmapImportV2Payload,
)
from app.services.roadmap_ai_planner import build_roadmap_planner
from app.services.context_export import ContextExportService
from app.services.decision_engine import DecisionEngineService
from app.services.quick_add import QuickAddService
from app.services.roadmap_import import RoadmapImportService


LEDGER_TRUTH_WARNING = (
    "Add any real income, expense, debt payment, or other money movement manually so it becomes ledger truth."
)


@dataclass(slots=True)
class RoadmapCopilotService:
    db: Session
    owner_id: str

    def current(self) -> RoadmapCopilotCurrentResponse:
        draft = (
            self.db.query(PlannerDraft)
            .filter(PlannerDraft.owner_id == self.owner_id, PlannerDraft.status == "draft")
            .order_by(PlannerDraft.updated_at.desc(), PlannerDraft.created_at.desc())
            .first()
        )
        return RoadmapCopilotCurrentResponse(draft=self._serialize_draft(draft) if draft else None)

    def draft(self, message: str, *, planner_source: str = "copilot") -> RoadmapCopilotDraftResponse:
        proposal = self._build_proposal(message)
        self._supersede_active_drafts()
        row = PlannerDraft(
            owner_id=self.owner_id,
            name=proposal.summary,
            status="draft",
            planner_source=planner_source,
            draft={
                "message": message,
                "summary": proposal.summary,
                "rationale": proposal.rationale,
                "warnings": proposal.warnings,
                "preview": proposal.preview.model_dump(mode="json"),
                "payload": proposal.payload.model_dump(mode="json"),
            },
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._serialize_draft(row)

    def revise(self, draft_id: str, revision_note: str) -> RoadmapCopilotDraftResponse:
        row = self._get_draft_or_raise(draft_id)
        message = str(row.draft.get("message", "") or "").strip()
        combined = f"{message}\n\nRevision: {revision_note.strip()}".strip()
        row.status = "superseded"
        return self.draft(combined, planner_source="copilot-revision")

    def approve(self, draft_id: str) -> RoadmapCopilotApproveResponse:
        row = self._get_draft_or_raise(draft_id)
        payload = RoadmapImportV2Payload.model_validate(row.draft.get("payload", {}))
        import_result = RoadmapImportService(self.db, self.owner_id).import_v2(payload)

        approved = self.db.query(PlannerDraft).filter(PlannerDraft.id == draft_id).one()
        approved.status = "approved"
        approved.draft = {
            **approved.draft,
            "import_result": import_result.model_dump(mode="json"),
        }
        self.db.commit()
        self.db.refresh(approved)
        return RoadmapCopilotApproveResponse(draft=self._serialize_draft(approved), import_result=import_result)

    def deny(self, draft_id: str) -> RoadmapCopilotDenyResponse:
        row = self._get_draft_or_raise(draft_id)
        row.status = "denied"
        self.db.commit()
        return RoadmapCopilotDenyResponse(draft=None)

    def emergency_expense(self, payload: RoadmapCopilotEmergencyExpenseRequest) -> RoadmapCopilotEmergencyExpenseResponse:
        quick_add = QuickAddService(self.db, self.owner_id).submit(
            QuickAddRequest(
                kind="expense",
                amount=payload.amount,
                title=payload.title,
                merchant_or_source=payload.merchant_or_source,
                category=payload.category,
                account=payload.account,
                date=payload.date,
                notes=payload.notes,
                status="received",
                recurrence="one-time",
                save_as_obligation=False,
                obligation_due_date=payload.date,
            )
        )
        draft = self.draft(
            f"{payload.message.strip()}\n\nRecorded emergency expense: {payload.title.strip() or 'Emergency expense'} for ${payload.amount:.2f}.",
            planner_source="copilot-emergency",
        )
        return RoadmapCopilotEmergencyExpenseResponse(quick_add=quick_add, draft=draft)

    def _get_draft_or_raise(self, draft_id: str) -> PlannerDraft:
        try:
            row = (
                self.db.query(PlannerDraft)
                .filter(PlannerDraft.owner_id == self.owner_id, PlannerDraft.id == draft_id)
                .one()
            )
        except NoResultFound as exc:
            raise ValueError("Draft not found") from exc
        if row.status != "draft":
            raise ValueError("Draft is no longer active")
        return row

    def _supersede_active_drafts(self) -> None:
        active = self.db.query(PlannerDraft).filter(PlannerDraft.owner_id == self.owner_id, PlannerDraft.status == "draft").all()
        for row in active:
            row.status = "superseded"
        self.db.flush()

    def _serialize_draft(self, row: PlannerDraft) -> RoadmapCopilotDraftResponse:
        return RoadmapCopilotDraftResponse(
            draft_id=row.id,
            status=row.status,
            summary=str(row.draft.get("summary", "")),
            rationale=str(row.draft.get("rationale", "")),
            warnings=[str(item) for item in row.draft.get("warnings", [])],
            preview=RoadmapCopilotPreview.model_validate(row.draft.get("preview", {})),
            payload=RoadmapImportV2Payload.model_validate(row.draft.get("payload", {})),
            message=str(row.draft.get("message", "")),
            planner_source=row.planner_source,
        )

    def _build_proposal(self, message: str) -> RoadmapCopilotDraftResponse:
        context = ContextExportService(self.db, self.owner_id).build()
        snapshot = DecisionEngineService(self.db, self.owner_id).build()
        proposal = build_roadmap_planner().plan(message=message, context=context, snapshot=snapshot)
        warnings = list(proposal.warnings)
        if LEDGER_TRUTH_WARNING not in warnings:
            warnings.append(LEDGER_TRUTH_WARNING)
        preview = RoadmapCopilotPreview(
            goals=[RoadmapCopilotPreviewGoal(title=item.title, priority=item.priority, step_count=len(item.steps)) for item in proposal.payload.goals],
            income_plans=[
                RoadmapCopilotPreviewIncomePlan(label=item.label, amount=item.amount, allocation_count=len(item.allocations))
                for item in proposal.payload.income_plans
            ],
            actions=[RoadmapCopilotPreviewAction(title=item.title, lane=item.lane) for item in proposal.payload.actions],
            preserved_income_entries=len(context.expected_income_entries),
        )

        return RoadmapCopilotDraftResponse(
            draft_id="draft-preview",
            status="draft",
            summary=proposal.summary,
            rationale=proposal.rationale,
            warnings=warnings,
            preview=preview,
            payload=proposal.payload,
            message=message.strip(),
            planner_source="copilot-preview",
        )
