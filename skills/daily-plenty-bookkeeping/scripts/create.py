#!/usr/bin/env python3
"""[INPUT]: 新账单 JSON、外部配置和私有操作文件。
[OUTPUT]: prepare/submit/status；创建成功返回 entryId、version 和完整 entry。
[POS]: 新增操作入口；HTTP、校验和重试基础设施来自 _common。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import sys
from _common import (INPUT_FIELDS, resolve_recorder, context, member_id, mutation_main,
                     parse_fields, prepare_operation, require, run, validate_links)


def prepare(client, raw, path):
    fields = INPUT_FIELDS | {"recordedByMemberId"}
    require(isinstance(raw, dict) and set(raw) <= fields, "输入含不支持的字段")
    require(fields - {"note"} <= set(raw), "请补全金额、日期、类型、分类、付款人和录入人")
    data = context(client, raw["occurredOn"])
    payload = parse_fields(raw, data["ledger"]["timezone"])
    user_id = resolve_recorder(data, raw["recordedByMemberId"])
    validate_links(data, payload)
    payload["recordedByMemberId"] = member_id(raw["recordedByMemberId"])
    return prepare_operation(client, path, "create", data["ledger"], payload,
                             {"createdBy": user_id, "updatedBy": user_id, "source": "ai", "version": 1})


if __name__ == "__main__":
    sys.exit(run(lambda: mutation_main("create", prepare)))
