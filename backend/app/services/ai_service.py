import json
from openai import AsyncOpenAI
from ..schemas.classify import TabInfo, GroupResult

SYSTEM_PROMPT = """你是一个浏览器标签页整理助手。用户会给你一组标签页的信息（标题和URL），请根据这些标签页的**实际内容/项目/需求**将它们分组。

分组规则：
1. 按项目/需求/任务维度分组，而不是按域名或网站类型
2. 比如 "XX需求开发"、"线上问题排查" 这样的语义分组
3. 可以创建新的分组名称，不限于用户已有的分组
4. 每个标签页只能属于一个分组
5. 分组名用中文，简洁明了（2-8个字）
6. 如果标签页无法判断归属，归入"其他"

返回严格的 JSON 格式，不要包含 markdown 标记：
{
  "groups": [
    {
      "name": "分组名称",
      "tab_ids": [1, 2, 3],
      "reason": "分组理由"
    }
  ]
}"""

async def classify_tabs(
    tabs: list[TabInfo],
    existing_groups: list[str],
    api_key: str,
    api_base: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> list[GroupResult]:
    """调用 AI 对标签页进行分类"""

    # 构建标签页列表描述
    tabs_desc = "\n".join([
        f"ID={t.id} | 标题: {t.title} | URL: {t.url} | 域名: {t.domain}"
        for t in tabs
    ])

    existing_desc = f"用户已有分组: {', '.join(existing_groups)}" if existing_groups else "用户还没有分组"

    client = AsyncOpenAI(api_key=api_key, base_url=api_base)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{existing_desc}\n\n待分类标签页:\n{tabs_desc}"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content or "{}"
    data = json.loads(content)

    return [
        GroupResult(
            name=g["name"],
            tab_ids=g["tab_ids"],
            reason=g.get("reason", ""),
        )
        for g in data.get("groups", [])
    ]
