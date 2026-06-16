VENV := .venv
PY   := $(VENV)/bin/python
PIP  := $(VENV)/bin/pip
YTA  := $(VENV)/bin/yta

.PHONY: setup doctor run dry-run run-all-dry daemon-all test clean

setup:
	python3 -m venv $(VENV)
	$(PIP) install -U pip
	$(PIP) install -e ".[dev]"
	@echo "\n[OK] Setup complete. Copy .env.example to .env and fill in your keys."

doctor:
	$(YTA) doctor

run:
	$(YTA) run $(CHANNEL) --count 1

dry-run:
	$(YTA) run $(CHANNEL) --count 1 --dry-run

run-all-dry:
	$(YTA) run-all --count 1 --dry-run

daemon-all:
	$(YTA) daemon-all

test:
	$(VENV)/bin/pytest tests/ -v

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
