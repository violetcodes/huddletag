import csv
from pathlib import Path

from pydantic import BaseModel


class Item(BaseModel):
    item_id: str
    content_paths: list[str]


def parse_dataset(path: Path) -> list[Item]:
    items: list[Item] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            paths = [p.strip() for p in row["content_paths"].split("|")]
            items.append(Item(item_id=row["item_id"].strip(), content_paths=paths))
    return items
