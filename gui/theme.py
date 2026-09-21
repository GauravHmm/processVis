"""Design system: colors, fonts, spacing, and ttk style configuration."""

from __future__ import annotations

import tkinter.ttk as ttk


# ── Color Palette ─────────────────────────────────────────────────

BG_WINDOW = "#F0F2F5"
BG_CARD = "#FFFFFF"
BG_HEADER = "#1B2838"
BG_HOVER = "#E8EAED"
BG_SELECTED = "#DBEAFE"

ACCENT_BLUE = "#1976D2"
ACCENT_GREEN = "#388E3C"
ACCENT_ORANGE = "#F57C00"
ACCENT_RED = "#D32F2F"
ACCENT_PURPLE = "#7B1FA2"
ACCENT_TEAL = "#00796B"

STATE_COLORS: dict[str, tuple[str, str]] = {
    "NEW": ("#E8F5E9", "#2E7D32"),
    "READY": ("#E3F2FD", "#1565C0"),
    "RUNNING": ("#FFF3E0", "#E65100"),
    "BLOCKED": ("#FCE4EC", "#C62828"),
    "TERMINATED": ("#F3E5F5", "#6A1B9A"),
}

TEXT_PRIMARY = "#212121"
TEXT_SECONDARY = "#616161"
TEXT_LIGHT = "#FFFFFF"
TEXT_MUTED = "#9E9E9E"

BORDER = "#DADCE0"
BORDER_LIGHT = "#E0E0E0"

LOG_CREATED = "#2E7D32"
LOG_TRANSITION = "#1565C0"
LOG_REJECTED = "#C62828"
LOG_RESET = "#E65100"


# ── Fonts ──────────────────────────────────────────────────────────

FONT_HEADER = ("Helvetica", 14, "bold")
FONT_SUBHEADER = ("Helvetica", 11, "bold")
FONT_SECTION = ("Helvetica", 10, "bold")
FONT_BODY = ("Helvetica", 10)
FONT_SMALL = ("Helvetica", 9)
FONT_MONO = ("Courier", 10)
FONT_MONO_SMALL = ("Courier", 9)
FONT_BUTTON = ("Helvetica", 9, "bold")


# ── Spacing ────────────────────────────────────────────────────────

PAD_XS = 2
PAD_SM = 4
PAD_MD = 8
PAD_LG = 12
PAD_XL = 16

GAP_SM = 4
GAP_MD = 8
GAP_LG = 12


# ── Style Configuration ───────────────────────────────────────────

def apply_theme(style: ttk.Style) -> None:
    """Configure ttk styles for a modern look. Call once at startup."""
    style.theme_use("clam")

    style.configure(".", font=FONT_BODY, background=BG_WINDOW, foreground=TEXT_PRIMARY)
    style.configure("TFrame", background=BG_WINDOW)
    style.configure("Card.TFrame", background=BG_CARD)
    style.configure("Header.TFrame", background=BG_HEADER)

    style.configure("TLabel", background=BG_WINDOW, foreground=TEXT_PRIMARY, font=FONT_BODY)
    style.configure("Card.TLabel", background=BG_CARD)
    style.configure("Header.TLabel", background=BG_HEADER, foreground=TEXT_LIGHT, font=FONT_HEADER)
    style.configure("SubHeader.TLabel", background=BG_HEADER, foreground="#B0BEC5", font=FONT_SMALL)
    style.configure("Section.TLabel", font=FONT_SECTION, foreground=TEXT_PRIMARY)
    style.configure("CardSection.TLabel", background=BG_CARD, font=FONT_SECTION, foreground=TEXT_SECONDARY)
    style.configure("FieldValue.TLabel", background=BG_CARD, font=FONT_MONO, foreground=TEXT_PRIMARY)
    style.configure("FieldName.TLabel", background=BG_CARD, font=FONT_SMALL, foreground=TEXT_SECONDARY)
    style.configure("Muted.TLabel", background=BG_CARD, font=FONT_SMALL, foreground=TEXT_MUTED)

    style.configure(
        "Accent.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_BLUE,
        foreground=TEXT_LIGHT,
    )
    style.map("Accent.TButton",
        background=[("active", "#1565C0"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Green.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_GREEN,
        foreground=TEXT_LIGHT,
    )
    style.map("Green.TButton",
        background=[("active", "#2E7D32"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Red.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_RED,
        foreground=TEXT_LIGHT,
    )
    style.map("Red.TButton",
        background=[("active", "#B71C1C"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Orange.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_ORANGE,
        foreground=TEXT_LIGHT,
    )
    style.map("Orange.TButton",
        background=[("active", "#E65100"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Teal.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_TEAL,
        foreground=TEXT_LIGHT,
    )
    style.map("Teal.TButton",
        background=[("active", "#00695C"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Purple.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_PURPLE,
        foreground=TEXT_LIGHT,
    )
    style.map("Purple.TButton",
        background=[("active", "#6A1B9A"), ("disabled", BORDER_LIGHT)],
        foreground=[("disabled", TEXT_MUTED)],
    )

    style.configure(
        "Danger.TButton",
        font=FONT_BUTTON,
        padding=(PAD_LG, PAD_SM),
        background=ACCENT_RED,
        foreground=TEXT_LIGHT,
    )
    style.map("Danger.TButton",
        background=[("active", "#B71C1C")],
    )

    style.configure(
        "Treeview",
        rowheight=28,
        font=FONT_BODY,
        background=BG_CARD,
        fieldbackground=BG_CARD,
        foreground=TEXT_PRIMARY,
        borderwidth=0,
    )
    style.configure(
        "Treeview.Heading",
        font=FONT_SECTION,
        background=BORDER_LIGHT,
        foreground=TEXT_PRIMARY,
        relief="flat",
    )
    style.map("Treeview",
        background=[("selected", BG_SELECTED)],
        foreground=[("selected", ACCENT_BLUE)],
    )
    style.map("Treeview.Heading",
        background=[("active", BORDER)],
    )

    style.configure("TEntry", font=FONT_BODY, padding=PAD_SM)
    style.configure("TCombobox", font=FONT_BODY, padding=PAD_SM)

    style.configure("Horizontal.TScrollbar", background=BORDER_LIGHT, troughcolor=BG_WINDOW)
    style.configure("Vertical.TScrollbar", background=BORDER_LIGHT, troughcolor=BG_WINDOW)
