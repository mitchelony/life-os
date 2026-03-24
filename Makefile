.PHONY: api-install api-test web-install web-dev

api-install:
	python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r apps/api/requirements-dev.txt

api-test:
	. .venv/bin/activate && pytest apps/api/tests

web-install:
	npm install

web-dev:
	npm run dev:web
