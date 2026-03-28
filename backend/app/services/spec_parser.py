from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict


class ContentSlot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    slot: str


class FeedbackField(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    type: str
    options: list[str] | None = None


class AnnotSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    data_dir: str
    content_schema: list[ContentSlot]
    feedbacks: list[FeedbackField]


def parse_spec(path: Path) -> AnnotSpec:
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return AnnotSpec(**raw)
