#!/usr/bin/env python3
"""
Generate an A4 LaTeX multiplication worksheet, compile it with pdflatex,
and open the resulting PDF on macOS.

Each problem has three parts:

  1. mathString: the expression, e.g. 610 × 8161.
  2. grid: 45-degree line grid with one circle per line intersection.
  3. mathBoxes: one clearly separated two-square piece per line intersection.

The mathBoxes are arranged in brick-layer rows. For an m-by-n line grid, the
row lengths follow the visible rows of the intersection grid. For example, 3 × 4 gives:

    1, 2, 3, 3, 2, 1

which totals 12 pieces, exactly matching the 12 intersections.

Examples:
  python3 generate_multiplication_worksheet.py 3
  python3 generate_multiplication_worksheet.py 12 --seed 1234
  python3 generate_multiplication_worksheet.py 6 --no-open
"""

import argparse
import math
import random
import shutil
import subprocess
import sys
from pathlib import Path


def random_number(min_digits=2, max_digits=4):
    """Generate a random integer with 2–4 digits. Leading digit is never zero."""
    digits = random.randint(min_digits, max_digits)
    first = str(random.randint(1, 9))
    rest = "".join(str(random.randint(0, 9)) for _ in range(digits - 1))
    return first + rest


def visual_rows(m, n):
    """
    Group intersections into the same top-to-bottom rows that appear in
    the 45-degree grid.

    In grid coordinates:
      i = digit index from the first number
      j = digit index from the second number

    The visible vertical coordinate of a circle is proportional to i - j.
    So rows are grouped by i-j, from top to bottom.

    Within a row, the visible horizontal coordinate is proportional to i+j.
    That same quantity determines the square-grid position of the box pieces.
    """
    rows = []
    for d in range(m - 1, -n, -1):
        row = []
        for i in range(m):
            for j in range(n):
                if i - j == d:
                    row.append((i, j))
        row.sort(key=lambda ij: ij[0] + ij[1])
        rows.append(row)
    return rows

def problem_tikz(a, b):
    """
    Generate one TikZ picture.

    Every digit, including zero, creates a line.

    The number of mathBox pieces is exactly:
        len(a) * len(b)

    This is the same as the number of circles/intersections in the grid.
    """

    a_digits = list(a)
    b_digits = list(b)

    m = len(a_digits)
    n = len(b_digits)

    # Geometry for the 45-degree intersection grid.
    sep = 0.68
    margin = 0.28
    label_offset = 0.18

    u_min = -margin
    u_max = (n - 1) * sep + margin
    v_min = -margin
    v_max = (m - 1) * sep + margin

    # Local layout.
    title_x = -0.78
    title_y = 2.62
    grid_x = 0.92
    grid_y = -0.38

    # mathBoxes: close but visibly separate brick-layer pieces.
    # Each piece is a two-square horizontal domino.
    square = 0.580
    piece_gap = 0.075       # visible narrow gap between pieces
    line_width = 0.60

    piece_width = 2 * square
    piece_height = square

    # Pieces in the same row sit side by side with a small gap.
    piece_step_x = piece_width + piece_gap

    # Rows sit one square-height apart with the same visual gap.
    row_step_y = piece_height + piece_gap

    # To get brickwork, shorter rows are centered under/over longer rows.
    # This naturally shifts them by roughly one square when row lengths differ.
    boxes_x = grid_x + 2.18 + 0.04 * max(n - 2, 0)
    boxes_y = grid_y - 1.48

    lines = []

    lines.append(r"\begin{tikzpicture}[")
    lines.append(r"  ink/.style={blue!75!black},")
    lines.append(r"  multline/.style={ink, line width=0.78pt},")
    lines.append(r"  dot/.style={circle, fill=blue!75!black, inner sep=1.45pt},")
    lines.append(r"  digit/.style={ink, font=\large},")
    lines.append(r"  title/.style={ink, font=\Large},")
    lines.append(rf"  boxline/.style={{ink, line width={line_width:.2f}pt}}")
    lines.append(r"]")
    lines.append("")

    # Predictable wide rectangle for each problem.
    lines.append(r"\path[use as bounding box] (-1.10,-4.25) rectangle (7.45,3.05);")
    lines.append(r"\draw[ink, line width=0.25pt] (-1.10,-4.25) rectangle (7.45,3.05);")
    lines.append("")

    # mathString: its own upper band.
    lines.append(rf"\node[title, anchor=west] at ({title_x:.3f},{title_y:.3f}) {{$ {a} \times {b} $}};")
    lines.append("")

    # grid: lower band.
    lines.append(rf"\begin{{scope}}[xshift={grid_x:.3f}cm, yshift={grid_y:.3f}cm]")
    lines.append(r"  \pgfmathsetmacro{\rt}{0.70710678}")
    lines.append(r"  \newcommand{\pt}[2]{({(#1+#2)*\rt},{(#2-#1)*\rt})}")
    lines.append("")

    # Family A: digits of a, constant v, running along u.
    for i, _digit in enumerate(a_digits):
        v = i * sep
        lines.append(
            rf"  \draw[multline] \pt{{{u_min:.3f}}}{{{v:.3f}}} -- "
            rf"\pt{{{u_max:.3f}}}{{{v:.3f}}};"
        )

    # Family B: digits of b, constant u, running along v.
    for j, _digit in enumerate(b_digits):
        u = j * sep
        lines.append(
            rf"  \draw[multline] \pt{{{u:.3f}}}{{{v_min:.3f}}} -- "
            rf"\pt{{{u:.3f}}}{{{v_max:.3f}}};"
        )

    lines.append("")

    # Circles: exactly m*n.
    for i in range(m):
        v = i * sep
        for j in range(n):
            u = j * sep
            lines.append(rf"  \node[dot] at \pt{{{u:.3f}}}{{{v:.3f}}} {{}};")

    lines.append("")

    # Labels for first number.
    for i, digit in enumerate(a_digits):
        v = i * sep
        lines.append(
            rf"  \node[digit, anchor=east] at "
            rf"\pt{{{u_min - label_offset:.3f}}}{{{v:.3f}}} {{{digit}}};"
        )

    # Labels for second number.
    for j, digit in enumerate(b_digits):
        u = j * sep
        lines.append(
            rf"  \node[digit, anchor=north east] at "
            rf"\pt{{{u:.3f}}}{{{v_min - label_offset:.3f}}} {{{digit}}};"
        )

    lines.append(r"\end{scope}")
    lines.append("")

    # mathBoxes.
    lines.append(r"% mathBoxes: exactly one domino piece per line intersection")
    lines.append(rf"% intersection count = {m} * {n} = {m*n}")
    lines.append(rf"\begin{{scope}}[xshift={boxes_x:.3f}cm, yshift={boxes_y:.3f}cm]")
    lines.append(rf"  \def\s{{{square:.3f}}}")
    lines.append("")
    lines.append(r"  \newcommand{\pieceAt}[2]{%")
    lines.append(r"    \pgfmathsetmacro{\x}{#1}%")
    lines.append(r"    \pgfmathsetmacro{\y}{#2}%")
    lines.append(r"    \draw[boxline, fill=white] (\x,\y) rectangle ++({2*\s},\s);")
    lines.append(r"    \draw[boxline] ({\x+\s},\y) -- ++(0,\s);")
    lines.append(r"  }")
    lines.append("")

    rows = visual_rows(m, n)

    # The box pieces are snapped to the square grid.  A piece is two squares
    # wide, so moving by two square-grid steps places the next piece adjacent
    # with one narrow gap.  Moving by one square-grid step is exactly the
    # half-piece translation seen between neighboring brick rows.
    square_step = square + piece_gap / 2

    # Normalize x so the leftmost possible anchor is at zero.
    all_x_indices = [i + j for row in rows for (i, j) in row]
    min_x_index = min(all_x_indices)

    # Draw rows top-to-bottom.  Each row uses the same relative positions as
    # the circles in the grid:
    #
    #   row membership: i - j
    #   horizontal position: i + j
    #
    # This fixes the earlier mistake where the pieces were grouped by i+j
    # rather than by their visible grid row.
    piece_counter = 0
    for d, row in enumerate(rows):
        y = (len(rows) - 1 - d) * row_step_y

        for i, j in row:
            x_index = i + j
            x = (x_index - min_x_index) * square_step
            lines.append(rf"  \pieceAt{{{x:.3f}}}{{{y:.3f}}}")
            piece_counter += 1

    lines.append(rf"  % pieces drawn = {piece_counter}")
    lines.append(r"\end{scope}")
    lines.append("")
    lines.append(r"\end{tikzpicture}")

    return "\n".join(lines)


def choose_grid(count):
    """
    Choose worksheet layout.

    For fewer than four problems, use portrait orientation and stack them:
      1 problem: 1 x 1
      2 problems: 2 x 1
      3 problems: 3 x 1

    For four or more problems, use landscape orientation:
      4 problems: 2 x 2
      5-6 problems: 2 x 3
      7-8 problems: 2 x 4
      9 problems: 3 x 3
      10-12 problems: 3 x 4
    """
    if count == 1:
        return 1, 1
    if count == 2:
        return 2, 1
    if count == 3:
        return 3, 1
    if count == 4:
        return 2, 2
    if count <= 6:
        return 2, 3
    if count <= 8:
        return 2, 4
    if count == 9:
        return 3, 3
    return 3, 4


def make_latex(problems):
    count = len(problems)
    rows, cols = choose_grid(count)

    cell_width = 1.000 / cols
    cell_height = 1.000 / rows

    parts = []

    orientation = "portrait" if count < 4 else "landscape"
    parts.append(rf"\documentclass[a4paper,{orientation},11pt]{{article}}")
    parts.append(r"\usepackage[margin=0.18cm]{geometry}")
    parts.append(r"\usepackage{tikz}")
    parts.append(r"\usepackage{graphicx}")
    parts.append(r"\usepackage{adjustbox}")
    parts.append(r"\pagestyle{empty}")
    parts.append(r"\setlength{\parindent}{0pt}")
    parts.append(r"\begin{document}")
    parts.append("")

    for row in range(rows):
        parts.append(r"\noindent")
        for col in range(cols):
            idx = row * cols + col

            parts.append(
                rf"\begin{{minipage}}[c][{cell_height:.3f}\textheight][c]"
                rf"{{{cell_width:.3f}\textwidth}}"
            )
            parts.append(r"\centering")

            if idx < count:
                a, b = problems[idx]
                tikz = problem_tikz(a, b)
                parts.append(rf"\begin{{adjustbox}}{{max width=1.000\linewidth,max height={cell_height * 1.000:.3f}\textheight,keepaspectratio}}")
                parts.append(tikz)
                parts.append(r"\end{adjustbox}")

            parts.append(r"\end{minipage}%")

        parts.append("")

    parts.append(r"\end{document}")
    parts.append("")

    return "\n".join(parts)


def next_output_stem(output_dir):
    """Return the next available stem: M001, M002, ..."""
    output_dir.mkdir(parents=True, exist_ok=True)

    for i in range(1, 1000):
        stem = f"M{i:03d}"
        if not (output_dir / f"{stem}.pdf").exists():
            return stem

    raise RuntimeError("Could not find an unused filename from M001.pdf to M999.pdf")


def run_pdflatex(tex_path, scratch_dir, stem):
    """
    Run pdflatex in scratch_dir so auxiliary files stay there.
    Return the generated PDF path inside scratch_dir.
    """
    if shutil.which("pdflatex") is None:
        raise RuntimeError(
            "pdflatex was not found. On macOS, install MacTeX or BasicTeX first."
        )

    cmd = [
        "pdflatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        tex_path.name,
    ]

    result = subprocess.run(
        cmd,
        cwd=scratch_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    log_path = scratch_dir / f"{stem}.pdflatex-output.txt"
    log_path.write_text(result.stdout, encoding="utf-8")

    if result.returncode != 0:
        raise RuntimeError(
            f"pdflatex failed. See {log_path} and {scratch_dir / (stem + '.log')}"
        )

    pdf_path = scratch_dir / f"{stem}.pdf"
    if not pdf_path.exists():
        raise RuntimeError("pdflatex finished, but no PDF was produced.")

    return pdf_path


def open_pdf(pdf_path):
    """Open the PDF in Preview on macOS."""
    if sys.platform == "darwin":
        subprocess.run(["open", "-a", "Preview", str(pdf_path)], check=False)
    else:
        print(f"PDF created: {pdf_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate, compile, and open an A4 multiplication worksheet."
    )
    parser.add_argument(
        "count",
        type=int,
        help="Number of problems to generate, from 1 to 12.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Optional random seed for repeatable worksheets.",
    )
    parser.add_argument(
        "--scratch-dir",
        default="scratchbook",
        help="Directory for .tex, .aux, .log, and other build files. Default: scratchbook",
    )
    parser.add_argument(
        "--output-dir",
        default=".",
        help="Directory for the final PDF. Default: current directory.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open the generated PDF after compiling.",
    )
    parser.add_argument(
        "--keep-pdf-in-scratch",
        action="store_true",
        help="Also leave a copy of the generated PDF in scratchbook.",
    )

    args = parser.parse_args()

    if not 1 <= args.count <= 12:
        raise SystemExit("Error: count must be a number between 1 and 12.")

    if args.seed is not None:
        random.seed(args.seed)

    output_dir = Path(args.output_dir).resolve()
    scratch_dir = Path(args.scratch_dir).resolve()
    scratch_dir.mkdir(parents=True, exist_ok=True)

    stem = next_output_stem(output_dir)
    tex_path = scratch_dir / f"{stem}.tex"

    problems = [(random_number(), random_number()) for _ in range(args.count)]
    tex_path.write_text(make_latex(problems), encoding="utf-8")

    print(f"Wrote LaTeX source: {tex_path}")

    try:
        scratch_pdf = run_pdflatex(tex_path, scratch_dir, stem)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)

    final_pdf = output_dir / f"{stem}.pdf"
    shutil.copy2(scratch_pdf, final_pdf)

    if not args.keep_pdf_in_scratch:
        try:
            scratch_pdf.unlink()
        except OSError:
            pass

    print(f"Wrote PDF: {final_pdf.name}")
    print("Problems:")
    for a, b in problems:
        print(f"  {a} × {b}")

    if not args.no_open:
        open_pdf(final_pdf)


if __name__ == "__main__":
    main()
