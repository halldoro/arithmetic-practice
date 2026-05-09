# Usage:
#   make py          → python3 practice.py
#   make py 3        → python3 practice.py 3
#   make clean       → remove generated PDFs and scratch dir

# Forward any extra goals on the command line as args to the script.
PY_ARGS := $(filter-out py,$(MAKECMDGOALS))

.PHONY: py clean

py:
	python3 practice.py $(PY_ARGS)

clean:
	rm -f M*.pdf
	rm -rf scratchbook

# Swallow stray goals (e.g. the `3` in `make py 3`) so make doesn't error.
%:
	@:
