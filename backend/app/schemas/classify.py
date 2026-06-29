from pydantic import BaseModel

class TabInfo(BaseModel):
    id: int
    title: str
    url: str
    domain: str = ""

class ClassifyRequest(BaseModel):
    tabs: list[TabInfo]
    existing_groups: list[str] = []

class GroupResult(BaseModel):
    name: str
    tab_ids: list[int]
    reason: str = ""  # AI 给出的分组理由

class ClassifyResponse(BaseModel):
    groups: list[GroupResult]
