#!/usr/bin/env python3
"""[INPUT]: 已创建账单 ID、要修改的字段、修改人及可选已知版本。
[OUTPUT]: 按 ID 查询/合并 AI 账单，持久化带版本的 PATCH，返回相同 entryId 和新版本。
[POS]: 修改操作入口；人工来源立即拒绝，不修改创建人/来源，不把纠错当新增。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import sys
from _common import (INPUT_FIELDS, resolve_recorder, context, member_id, mutation_main,
                     parse_fields, prepare_operation, require, run, validate_links)


def prepare(client, raw, path, entry_id):
    require(isinstance(raw, dict) and set(raw) <= INPUT_FIELDS | {"updatedByMemberId", "version"},
            "只支持修改账单字段、updatedByMemberId 和可选 version")
    require("updatedByMemberId" in raw and bool(set(raw) & INPUT_FIELDS), "请指定修改人及至少一个修改字段")
    ledger = client.ledger()
    previous = client.request("GET", "ledgers/" + ledger["id"] + "/entries/" + entry_id)
    require(previous.get("id") == entry_id and previous.get("ledgerId") == ledger["id"], "账单响应与目标不一致")
    require(previous.get("source") == "ai" and not previous.get("deletedAt"), "只能修改未删除的 AI 账单；人工记录请在网页修改")
    require(type(previous.get("version")) is int and previous["version"] > 0, "账单版本无效")
    if "version" in raw:
        require(type(raw["version"]) is int and raw["version"] == previous["version"],
                "账单版本已变化，请查询最新记录并核对修改意图")
    merged = {k: previous[k] for k in INPUT_FIELDS - {"amount"}}
    minor = previous["amountMinor"]
    merged["amount"] = f"{minor // 100}.{minor % 100:02d}"
    merged.update({k: v for k, v in raw.items() if k in INPUT_FIELDS})
    data = context(client, merged["occurredOn"], ledger)
    require(data["ledger"]["id"] == ledger["id"], "准备期间账本发生变化")
    payload = parse_fields(merged, ledger["timezone"])
    validate_links(data, payload, previous)
    user_id = resolve_recorder(data, raw["updatedByMemberId"])
    payload.update(version=previous["version"], updatedByMemberId=member_id(raw["updatedByMemberId"]))
    return prepare_operation(client, path, "update", ledger, payload,
                             {"id": entry_id, "version": previous["version"] + 1, "source": "ai",
                              "createdBy": previous["createdBy"], "updatedBy": user_id}, entry_id)


if __name__ == "__main__":
    sys.exit(run(lambda: mutation_main("update", prepare)))
