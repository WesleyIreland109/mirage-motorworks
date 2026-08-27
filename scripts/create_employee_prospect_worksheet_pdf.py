from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "mirage-employee-prospect-worksheet.pdf"
PUBLIC_OUTPUT = ROOT / "frontend" / "public" / "resources" / "employee-prospect-worksheet.pdf"
LOGO = ROOT / "frontend" / "public" / "brand" / "mirage-wordmark.png"

PAGE_W, PAGE_H = letter
MARGIN = 42
DARK = colors.HexColor("#09090B")
SURFACE = colors.HexColor("#14151A")
TEXT = colors.HexColor("#101218")
MUTED = colors.HexColor("#5D6470")
CYAN = colors.HexColor("#39E4FF")
PINK = colors.HexColor("#FF46B9")
ORANGE = colors.HexColor("#FF9748")
BORDER = colors.HexColor("#D9DCE3")


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=8.8, leading=11, color=TEXT):
    c.setFillColor(color)
    c.setFont(font, size)
    lines = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_header(c, page_label):
    c.setFillColor(DARK)
    c.rect(0, PAGE_H - 112, PAGE_W, 112, stroke=0, fill=1)
    logo = ImageReader(str(LOGO))
    c.drawImage(logo, MARGIN, PAGE_H - 100, width=150, height=100, mask="auto")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 53, "Employee Prospect Worksheet")
    c.setFillColor(colors.HexColor("#A5A7B2"))
    c.setFont("Helvetica", 9.5)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 73, "Print, inspect, scan, then enter the report into GarageOS.")
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 92, page_label.upper())


def draw_footer(c, page_num):
    c.setStrokeColor(BORDER)
    c.line(MARGIN, 34, PAGE_W - MARGIN, 34)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 20, "Mirage Motorworks internal prospect worksheet - enter final notes into GarageOS.")
    c.drawRightString(PAGE_W - MARGIN, 20, f"Page {page_num}")


def labeled_line(c, label, x, y, width, hint=""):
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x, y, label.upper())
    if hint:
        c.setFont("Helvetica", 7.2)
        c.drawRightString(x + width, y, hint)
    c.setStrokeColor(BORDER)
    c.line(x, y - 9, x + width, y - 9)
    return y - 28


def check_row(c, label, x, y, width):
    box = 9
    c.setStrokeColor(colors.HexColor("#8B929F"))
    c.rect(x, y - 7, box, box, stroke=1, fill=0)
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 8.7)
    text_bottom = draw_wrapped(c, label, x + 14, y, width - 168, size=8.7, leading=10)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.2)
    for i, result in enumerate(["Pass", "Monitor", "Fail", "N/A"]):
        rx = x + width - 144 + i * 36
        c.rect(rx, y - 7, 8, 8, stroke=1, fill=0)
        c.drawString(rx + 11, y - 6, result)
    c.setStrokeColor(colors.HexColor("#EBEDF2"))
    line_y = min(y - 22, text_bottom - 2)
    c.line(x + 14, line_y, x + width, line_y)
    return line_y - 15


def section(c, title, items, x, y, width):
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, title.upper())
    c.setStrokeColor(CYAN)
    c.setLineWidth(1.1)
    c.line(x, y - 5, x + 34, y - 5)
    y -= 22
    for item in items:
        y = check_row(c, item, x, y, width)
    return y - 4


def note_box(c, title, x, y, width, height, lines=4):
    c.setStrokeColor(BORDER)
    c.roundRect(x, y - height, width, height, 5, stroke=1, fill=0)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 10, y - 17, title)
    c.setStrokeColor(colors.HexColor("#E5E7EC"))
    for i in range(lines):
        line_y = y - 38 - i * 18
        c.line(x + 10, line_y, x + width - 10, line_y)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter)
    c.setTitle("Mirage Motorworks Employee Prospect Worksheet")
    c.setAuthor("Mirage Motorworks")
    c.setSubject("Internal acquisition inspection worksheet")

    draw_header(c, "Listing and inspection")
    top = PAGE_H - 140
    gutter = 24
    col_w = (PAGE_W - 2 * MARGIN - gutter) / 2
    left_x = MARGIN
    right_x = MARGIN + col_w + gutter

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left_x, top, "PROSPECT DETAILS")
    y = top - 18
    y = labeled_line(c, "Listing URL", left_x, y, PAGE_W - 2 * MARGIN, "Cars & Bids, Marketplace, dealer, private seller")
    y = labeled_line(c, "Vehicle label", left_x, y, col_w, "Year / model / trim")
    y = labeled_line(c, "VIN", right_x, y + 28, col_w, "Confirm if visible")
    y = labeled_line(c, "Seller", left_x, y, col_w)
    y = labeled_line(c, "Location", right_x, y + 28, col_w)
    y = labeled_line(c, "Asking price", left_x, y, col_w)
    y = labeled_line(c, "Mileage", right_x, y + 28, col_w)
    y = labeled_line(c, "Inspection date / staff", left_x, y, PAGE_W - 2 * MARGIN)

    y = y - 8
    y = section(c, "Listing Review", [
        "Title story, seller details, mileage, and ownership history look consistent.",
        "Photos show enough exterior, interior, engine bay, underside, and flaw detail.",
        "Asking price leaves room for transport, parts, labor, detail, and Mirage margin.",
    ], left_x, y, PAGE_W - 2 * MARGIN)
    section(c, "Exterior", [
        "Paint, body gaps, glass, lights, trim, and visible accident clues were checked.",
        "Rust, underside condition, leaks, tire age, and tire wear were checked.",
        "OEM+ potential is clear without hiding major body or structure risk.",
    ], left_x, y, PAGE_W - 2 * MARGIN)

    draw_footer(c, 1)
    c.showPage()

    draw_header(c, "Inspection and OBD")
    y = top
    y = section(c, "Interior", [
        "Interior wear, smell, water intrusion signs, electronics, and safety equipment were checked.",
        "Dash warning lights behave normally at startup and after the engine is running.",
        "Cabin condition supports the target buyer and planned Mirage presentation.",
    ], left_x, y, PAGE_W - 2 * MARGIN)
    y = section(c, "Mechanical Drive", [
        "Cold start, idle, fluids, charging, cooling, belts, and hoses were checked.",
        "Steering, braking, suspension, clutch or transmission, and highway behavior were checked.",
        "Any immediate unsafe, expensive, or story-changing issue is documented.",
    ], left_x, y, PAGE_W - 2 * MARGIN)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left_x, y, "OBD SCAN SNAPSHOT")
    y -= 22
    y_obd_left = y
    for label in ["Scanner used", "Scanner model", "Stored codes", "Pending codes"]:
        y_obd_left = labeled_line(c, label, left_x, y_obd_left, col_w)
    y_obd_right = y
    for label in ["Permanent codes", "Readiness monitors", "Freeze frame present", "Misfire / fuel trim concerns"]:
        y_obd_right = labeled_line(c, label, right_x, y_obd_right, col_w)
    note_y = min(y_obd_left, y_obd_right) + 8
    note_box(c, "Code summary", left_x, note_y, col_w, 82, lines=3)
    note_box(c, "Live data notes", right_x, note_y, col_w, 82, lines=3)

    draw_footer(c, 2)
    c.showPage()

    draw_header(c, "Value and decision")
    y2 = top
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left_x, y2, "MIRAGE VALUE TARGET")
    y2 -= 22
    for label in ["Estimated repairs", "Transport / fees", "Target sale price", "Mirage target offer", "Decision owner"]:
        y2 = labeled_line(c, label, left_x, y2, col_w)
    c.setFillColor(SURFACE)
    c.roundRect(right_x, top - 118, col_w, 108, 6, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(right_x + 12, top - 36, "Future MirageAI valuation")
    draw_wrapped(
        c,
        "This worksheet is meant to become training and decision data. Later, MirageAI can compare listing facts, inspection results, OBD notes, repair estimates, and historical outcomes to suggest what Mirage should pay.",
        right_x + 12,
        top - 54,
        col_w - 24,
        size=8.4,
        leading=10,
        color=colors.HexColor("#DDE3EC"),
    )

    note_box(c, "Employee summary", left_x, 384, PAGE_W - 2 * MARGIN, 96, lines=4)
    note_box(c, "Follow-up / parts / inspection notes", left_x, 258, PAGE_W - 2 * MARGIN, 96, lines=4)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left_x, 132, "Decision:")
    c.setFont("Helvetica", 8.5)
    for i, label in enumerate(["Pursue", "Inspect further", "Pass", "Purchased"]):
        x = left_x + 58 + i * 92
        c.rect(x, 126, 9, 9, stroke=1, fill=0)
        c.drawString(x + 13, 127, label)

    draw_footer(c, 3)
    c.save()
    PUBLIC_OUTPUT.write_bytes(OUTPUT.read_bytes())
    print(OUTPUT)
    print(PUBLIC_OUTPUT)


if __name__ == "__main__":
    build_pdf()
