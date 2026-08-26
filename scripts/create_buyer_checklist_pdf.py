from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "mirage-used-car-buyer-checklist.pdf"
PUBLIC_OUTPUT = ROOT / "frontend" / "public" / "resources" / "used-car-buyer-checklist.pdf"
LOGO = ROOT / "frontend" / "public" / "brand" / "mirage-wordmark.png"

PAGE_W, PAGE_H = letter
MARGIN = 44
DARK = colors.HexColor("#09090B")
SURFACE = colors.HexColor("#14151A")
TEXT = colors.HexColor("#101218")
MUTED = colors.HexColor("#5D6470")
CYAN = colors.HexColor("#39E4FF")
PINK = colors.HexColor("#FF46B9")
ORANGE = colors.HexColor("#FF9748")
BORDER = colors.HexColor("#D9DCE3")


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=9.4, leading=12, color=TEXT):
    c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    lines = []
    current = ""
    for word in words:
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


def checkbox_item(c, text, x, y, width):
    box = 10
    c.setStrokeColor(colors.HexColor("#8B929F"))
    c.setLineWidth(1)
    c.rect(x, y - 8, box, box, stroke=1, fill=0)
    return draw_wrapped(c, text, x + 16, y, width - 16, size=9.3, leading=12)


def section(c, title, items, x, y, width):
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, title.upper())
    c.setStrokeColor(CYAN)
    c.setLineWidth(1.2)
    c.line(x, y - 5, x + 34, y - 5)
    y -= 22
    for item in items:
        y = checkbox_item(c, item, x, y, width)
        y -= 7
    return y - 6


def draw_header(c, page_label):
    c.setFillColor(DARK)
    c.rect(0, PAGE_H - 116, PAGE_W, 116, stroke=0, fill=1)
    c.setFillColor(SURFACE)
    c.rect(0, PAGE_H - 116, PAGE_W, 1, stroke=0, fill=1)

    logo = ImageReader(str(LOGO))
    logo_w = 170
    logo_h = 113
    c.drawImage(logo, MARGIN, PAGE_H - 104, width=logo_w, height=logo_h, mask="auto")

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 26)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 55, "Used Car Buyer Checklist")
    c.setFillColor(colors.HexColor("#A5A7B2"))
    c.setFont("Helvetica", 10)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 76, "A high-level walkaround and test-drive guide before you hand over money.")
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 95, page_label.upper())


def draw_footer(c, page_num):
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.7)
    c.line(MARGIN, 36, PAGE_W - MARGIN, 36)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 22, "Mirage Motorworks - buyer checklist concept - not a replacement for a professional inspection.")
    c.drawRightString(PAGE_W - MARGIN, 22, f"Page {page_num}")


def status_card(c, x, y, width, height):
    c.setFillColor(colors.HexColor("#F6F7FA"))
    c.setStrokeColor(BORDER)
    c.roundRect(x, y - height, width, height, 6, stroke=1, fill=1)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 16, y - 24, "Overall Status")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(x + 16, y - 39, "Circle one, then add notes before you decide.")

    options = [("Good candidate", CYAN), ("Needs inspection", ORANGE), ("Walk away", PINK)]
    option_y = y - 66
    for label, color in options:
        c.setStrokeColor(color)
        c.circle(x + 22, option_y + 3, 5, stroke=1, fill=0)
        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(x + 34, option_y, label)
        option_y -= 22

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 16, y - 141, "Repair risk")
    for i, label in enumerate(["Low", "Medium", "High"]):
        px = x + 16 + i * 78
        c.setStrokeColor(colors.HexColor("#8B929F"))
        c.rect(px, y - 164, 10, 10, stroke=1, fill=0)
        c.setFillColor(TEXT)
        c.setFont("Helvetica", 9)
        c.drawString(px + 15, y - 162, label)


def notes_box(c, x, y, width, height, title, line_count=4):
    c.setStrokeColor(BORDER)
    c.setFillColor(colors.white)
    c.roundRect(x, y - height, width, height, 6, stroke=1, fill=1)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 12, y - 19, title)
    c.setStrokeColor(colors.HexColor("#E5E7EC"))
    for i in range(line_count):
        line_y = y - 42 - i * 22
        c.line(x + 12, line_y, x + width - 12, line_y)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter)
    c.setTitle("Mirage Motorworks Used Car Buyer Checklist")
    c.setAuthor("Mirage Motorworks")
    c.setSubject("High-level used car inspection checklist")

    draw_header(c, "Walkaround and drive")
    top = PAGE_H - 146
    gutter = 28
    col_w = (PAGE_W - 2 * MARGIN - gutter) / 2
    left_x = MARGIN
    right_x = MARGIN + col_w + gutter

    y_left = top
    y_left = section(c, "Before You Go", [
        "Ask for the VIN, mileage, title status, and known issues before meeting.",
        "Request service records, recent repairs, and any inspection or emissions paperwork.",
        "Bring a flashlight, paper towel, tire gauge, and an OBD scanner if you have one.",
        "Plan to see the car in daylight and test drive it long enough to get fully warm.",
    ], left_x, y_left, col_w)
    y_left = section(c, "Exterior", [
        "Walk around slowly and look for mismatched paint, overspray, dents, rust, or uneven gaps.",
        "Check windshield, mirrors, lights, signals, brake lights, and wipers.",
        "Look under the car for active leaks, hanging parts, heavy corrosion, or fresh damage.",
        "Open and close the hood, trunk, and every door. They should latch cleanly.",
    ], left_x, y_left, col_w)
    y_left = section(c, "Tires and Brakes", [
        "All four tires should be the same size and preferably a matching brand/model.",
        "Look for uneven tire wear, cracking, bubbles, or very old date codes.",
        "During braking, the car should stop smoothly without grinding, pulsing, or pulling.",
        "Make sure the parking brake holds and releases normally.",
    ], left_x, y_left, col_w)

    y_right = top
    y_right = section(c, "Interior", [
        "Confirm warning lights turn on at startup, then turn off after the engine starts.",
        "Test windows, locks, mirrors, seats, gauges, infotainment, heat, and air conditioning.",
        "Check for damp carpet, mildew, heavy air freshener, or signs of water intrusion.",
        "Seatbelts, airbags, child-seat anchors, and basic safety equipment should be intact.",
    ], right_x, y_right, col_w)
    y_right = section(c, "Under Hood", [
        "Look for obvious leaks, cracked hoses, loose wiring, corrosion, or missing covers.",
        "Check visible fluid levels and colors only when it is safe to do so.",
        "Listen for rough idle, knocking, squealing, ticking, or cooling fans running constantly.",
        "After the drive, confirm the car does not overheat or smell like coolant, oil, or fuel.",
    ], right_x, y_right, col_w)
    y_right = section(c, "Test Drive", [
        "The car should start cold without long cranking, smoke, or unstable idle.",
        "Steering should feel straight and predictable, with no shake or wandering.",
        "Transmission shifts should feel clean. Manual clutch engagement should be consistent.",
        "Suspension should feel controlled over bumps without clunks, rattles, or harsh pulling.",
        "Try city speeds, highway speeds, parking-lot turns, reverse, and a safe full stop.",
    ], right_x, y_right, col_w)
    draw_footer(c, 1)
    c.showPage()

    draw_header(c, "Paperwork and decision")
    y_left = top
    y_left = section(c, "Paperwork", [
        "VIN should match the title, dashboard, door sticker, and any seller-provided documents.",
        "Seller name should match the title or have proper dealer/agent paperwork.",
        "Ask about liens, rebuilt or salvage history, accidents, flood damage, and lemon-law history.",
        "Budget taxes, registration, tires, brakes, fluids, inspection, and immediate repairs.",
    ], left_x, y_left, col_w)
    y_left = section(c, "Reasons To Pause", [
        "Seller rushes you, refuses inspection, will not provide VIN, or changes the story.",
        "Title status is unclear, VIN plates look altered, or paperwork does not line up.",
        "The car has warning lights, overheating, unsafe tires, brake issues, or active leaks.",
        "The price only makes sense if you ignore obvious repairs.",
    ], left_x, y_left, col_w)

    c.setFillColor(SURFACE)
    c.roundRect(left_x, 118, col_w, 116, 6, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(left_x + 14, 206, "Future Mirage Hardware Scan")
    draw_wrapped(
        c,
        "The long-term Mirage workflow adds a plug-in scan and buyer report: live data, alerts, drive notes, and a clearer health snapshot before a purchase. For now, this checklist stays visual and high level.",
        left_x + 14,
        186,
        col_w - 28,
        size=9.2,
        leading=12,
        color=colors.HexColor("#DDE3EC"),
    )

    status_card(c, right_x, top, col_w, 190)

    field_y = top - 218
    labels = [
        ("Vehicle", "Year / make / model / trim"),
        ("VIN", "Copy from dash or door sticker"),
        ("Mileage", "Odometer reading"),
        ("Asking price", "Seller price"),
        ("Seller", "Name and contact"),
    ]
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(right_x, field_y, "Quick Details")
    field_y -= 18
    for label, hint in labels:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(right_x, field_y, label.upper())
        c.setFillColor(colors.HexColor("#A0A6B2"))
        c.setFont("Helvetica", 7.5)
        c.drawRightString(right_x + col_w, field_y, hint)
        c.setStrokeColor(BORDER)
        c.line(right_x, field_y - 10, right_x + col_w, field_y - 10)
        field_y -= 32

    notes_box(c, left_x, 106, PAGE_W - 2 * MARGIN, 62, "Final Notes", line_count=2)
    draw_footer(c, 2)
    c.save()
    PUBLIC_OUTPUT.write_bytes(OUTPUT.read_bytes())
    print(OUTPUT)
    print(PUBLIC_OUTPUT)


if __name__ == "__main__":
    build_pdf()
