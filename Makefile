# Usage:
#   make py          → python3 practice.py
#   make py 3        → python3 practice.py 3
#   make doc         → regenerate doc/ artifacts (currently the brick-layer SVG)
#   make clean       → remove generated PDFs and scratch dir

# Forward any extra goals on the command line as args to the script.
PY_ARGS := $(filter-out py,$(MAKECMDGOALS))

.PHONY: py doc clean

py:
	python3 practice.py $(PY_ARGS)

# Regenerate any generated documentation assets.
doc: doc/brick_layer_pattern.svg

# Brick-layer SVG is produced by re-running visualRows + drawMathBoxes
# from practice.html in Node. Rebuild whenever either source changes.
doc/brick_layer_pattern.svg: tools/gen_brick_pattern.mjs practice.html
	node tools/gen_brick_pattern.mjs

clean:
	rm -f M*.pdf
	rm -rf scratchbook

# Swallow stray goals (e.g. the `3` in `make py 3`) so make doesn't error.
%:
	@:
