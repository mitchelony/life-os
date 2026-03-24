# Life OS API

FastAPI backend scaffold for a single-user personal finance and life-management app.

## Local Setup

1. Create a virtual environment.
2. Install the package in editable mode with dev extras.
3. Copy `.env.example` to `.env` and set the database URL.

```bash
cd /Users/MAC/Documents/GitHub/life-os
python3 -m venv .venv
. .venv/bin/activate
pip install -r apps/api/requirements-dev.txt
cp .env.example .env
```

## Run

```bash
cd /Users/MAC/Documents/GitHub/life-os
npm run dev:api
```

## Tests

```bash
pytest
```

## Notes

- The app is designed for a single owner account.
- `transactions` is the source of truth for actual money movement.
- The available-spend calculation is intentionally conservative and explainable.
