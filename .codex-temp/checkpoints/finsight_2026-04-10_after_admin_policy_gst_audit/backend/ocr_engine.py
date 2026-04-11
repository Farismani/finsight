from __future__ import annotations

import io
import os
from pathlib import Path
import re
from typing import Any

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - handled at runtime
    Image = None
    ImageOps = None

try:
    import pytesseract
except ImportError:  # pragma: no cover - handled at runtime
    pytesseract = None


_AMOUNT_PATTERN = re.compile(
    r"(?:rs\.?|inr|₹)?\s*(?<!\d)(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?!\d)",
    re.IGNORECASE,
)
_DATE_PATTERNS = [
    re.compile(r"\b(\d{2}[/-]\d{2}[/-]\d{2,4})\b"),
    re.compile(r"\b(\d{4}[/-]\d{2}[/-]\d{2})\b"),
    re.compile(r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b"),
]
_CATEGORY_KEYWORDS = {
    "travel": ["taxi", "uber", "grab", "flight", "airlines", "rail", "train", "travel"],
    "meals": ["restaurant", "cafe", "coffee", "diner", "meal", "food", "lunch", "dinner"],
    "accommodation": ["hotel", "inn", "suite", "resort", "accommodation", "lodging"],
    "office_supplies": ["stationery", "office", "supplies", "print", "paper", "toner"],
    "training": ["training", "course", "seminar", "workshop", "certification"],
    "medical": ["clinic", "hospital", "pharmacy", "medical", "health"],
}


def extract_text(image: bytes | Any) -> str:
    if Image is None or ImageOps is None or pytesseract is None:
        raise RuntimeError(
            "OCR dependencies are not installed. Install Pillow and pytesseract first."
        )

    _configure_tesseract()

    if hasattr(image, "read"):
        image = image.read()

    if not image:
        return ""

    with Image.open(io.BytesIO(image)) as raw_image:
        prepared = ImageOps.grayscale(raw_image)
        prepared = ImageOps.autocontrast(prepared)
        prepared = prepared.point(lambda pixel: 255 if pixel > 165 else 0, mode="1")
        text = pytesseract.image_to_string(prepared, config="--psm 6")

    return text.strip()


def parse_receipt(text: str) -> dict[str, Any]:
    text = text or ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    lowered_text = text.lower()

    vendor = _extract_vendor(lines)
    amount = _extract_amount(lines, lowered_text)
    gst = _extract_gst(lines, lowered_text)
    date = _extract_date(text)
    category = _infer_category(lowered_text)

    return {
        "vendor": vendor,
        "amount": amount,
        "gst": gst,
        "date": date,
        "category": category,
    }


def _extract_vendor(lines: list[str]) -> str:
    blacklist = (
        "tax invoice",
        "receipt",
        "invoice",
        "bill",
        "gst",
        "total",
        "subtotal",
        "cash",
        "visa",
        "mastercard",
    )
    for line in lines[:6]:
        normalized = re.sub(r"[^A-Za-z0-9&'.\-\s]", "", line).strip()
        if not normalized or len(normalized) < 3:
            continue
        if any(token in normalized.lower() for token in blacklist):
            continue
        return normalized.title()
    return "Unknown vendor"


def _extract_amount(lines: list[str], lowered_text: str) -> float:
    priority_keywords = (
        "grand total",
        "total due",
        "net total",
        "amount due",
        "amount paid",
        "total amount",
        "total",
        "amt",
    )
    for keyword in priority_keywords:
        value = _extract_labeled_amount(lines, keyword)
        if value is not None:
            return value

    amounts = _extract_all_amounts(lowered_text)
    return max(amounts) if amounts else 0.0


def _extract_gst(lines: list[str], lowered_text: str) -> float:
    total_tax_keywords = ("total gst", "gst amount", "total tax", "tax amount")
    for keyword in total_tax_keywords:
        value = _extract_labeled_amount(lines, keyword)
        if value is not None:
            return value

    gst_values: list[float] = []
    gst_keywords = ("cgst", "sgst", "igst", "gst", "tax", "vat")
    ignored_tax_labels = ("gstin", "tax invoice", "tax id", "tax no")
    for line in lines:
        normalized_line = _normalize_ocr_text(line.lower())
        if any(label in normalized_line for label in ignored_tax_labels):
            continue
        if not any(keyword in normalized_line for keyword in gst_keywords):
            continue
        amounts = _extract_all_amounts(line, exclude_percentages=True)
        if amounts:
            gst_values.append(max(amounts))

    if gst_values:
        return round(sum(gst_values), 2)

    return 0.0


def _extract_date(text: str) -> str | None:
    for pattern in _DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1)
    return None


def _infer_category(lowered_text: str) -> str:
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in lowered_text for keyword in keywords):
            return category
    return "travel"


def _extract_labeled_amount(lines: list[str], keyword: str) -> float | None:
    for line in lines:
        normalized_line = _normalize_ocr_text(line.lower())
        if keyword not in normalized_line:
            continue
        amounts = _extract_all_amounts(line, exclude_percentages=True)
        if amounts:
            return max(amounts)
    return None


def _extract_all_amounts(text: str, exclude_percentages: bool = False) -> list[float]:
    values: list[float] = []
    for match in _AMOUNT_PATTERN.finditer(text):
        if exclude_percentages and _is_percentage_match(text, match.start(1), match.end(1)):
            continue
        value = _to_float(match.group(1))
        if value > 0:
            values.append(value)
    return values


def _to_float(raw_value: str) -> float:
    normalized = raw_value.replace(",", "").replace(" ", "")
    try:
        return round(float(normalized), 2)
    except ValueError:
        return 0.0


def _configure_tesseract() -> None:
    configured_path = getattr(pytesseract.pytesseract, "tesseract_cmd", "")
    if configured_path and Path(configured_path).exists():
        return

    candidates = [
        os.getenv("TESSERACT_CMD"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\tools\tesseract\tesseract.exe",
        r"C:\Chocolatey\lib\tesseract\tools\tesseract.exe",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            return


def _normalize_ocr_text(text: str) -> str:
    return (
        text.replace("0", "o")
        .replace("1", "l")
        .replace("|", "l")
        .replace("totai", "total")
        .replace("tota1", "total")
        .replace("arnount", "amount")
        .replace("g5t", "gst")
    )


def _is_percentage_match(text: str, start: int, end: int) -> bool:
    nearby = text[max(0, start - 2) : min(len(text), end + 2)]
    return "%" in nearby
