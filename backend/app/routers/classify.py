from fastapi import APIRouter, Header, HTTPException
from ..schemas.classify import ClassifyRequest, ClassifyResponse, TabInfo
from ..services.ai_service import classify_tabs

router = APIRouter(prefix="/api/v1", tags=["classify"])

@router.post("/classify", response_model=ClassifyResponse)
async def classify(
    req: ClassifyRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
    x_api_base: str = Header(default="https://api.openai.com/v1", alias="X-API-Base"),
    x_model: str = Header(default="gpt-4o-mini", alias="X-Model"),
):
    """AI 智能分类标签页"""
    if not x_api_key or x_api_key == "your-api-key":
        raise HTTPException(status_code=401, detail="请提供有效的 API Key")

    # 补充 domain
    for tab in req.tabs:
        if not tab.domain:
            try:
                from urllib.parse import urlparse
                tab.domain = urlparse(tab.url).hostname or ""
            except:
                tab.domain = ""

    groups = await classify_tabs(
        tabs=req.tabs,
        existing_groups=req.existing_groups,
        api_key=x_api_key,
        api_base=x_api_base,
        model=x_model,
    )

    return ClassifyResponse(groups=groups)
