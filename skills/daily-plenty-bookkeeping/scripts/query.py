#!/usr/bin/env python3
"""[INPUT]: 查询子命令、结构化筛选/统计参数、外部鉴权配置。
[OUTPUT]: context 候选、get 单条、list 分页/全量汇总、reports 日/月/年统计；只发 GET。
[POS]: 查询操作入口，不创建操作文件、不写账；账本和凭据由 _common 读取。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import re
import sys
from urllib.parse import urlencode
from _common import Client, context, member_id, member_or_all, money, occurred_on, read_json, require, run


def main():
    parser = argparse.ArgumentParser(description="日日有余账单查询")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("context").add_argument("--date", default="today")
    commands.add_parser("get").add_argument("--entry-id", required=True)
    for name in ("list", "reports"):
        commands.add_parser(name).add_argument("--input", default="-")
    args = parser.parse_args()
    client = Client()
    if args.command == "context":
        return context(client, args.date)
    ledger = client.ledger()
    base = "ledgers/" + ledger["id"]
    if args.command == "get":
        entry_id = member_id(args.entry_id)
        entry = client.request("GET", base + "/entries/" + entry_id)
        require(entry.get("id") == entry_id and entry.get("ledgerId") == ledger["id"], "账单响应与目标不一致")
        return {"entryId": entry["id"], "version": entry["version"], "entry": entry}
    query = read_json(args.input)
    require(isinstance(query, dict), "查询参数必须是 JSON 对象；无筛选传 {}")
    if args.command == "list":
        require(set(query) <= {"start", "end", "kind", "categoryIds", "memberId", "creatorId",
                               "minAmount", "maxAmount", "search", "sort", "page"}, "不支持的查询字段")
        for key in ("start", "end"):
            if key in query:
                query[key] = occurred_on(query[key], ledger["timezone"])
        for key in ("minAmount", "maxAmount"):
            if key in query:
                query[key] = 0 if query[key] in ("0", "0.0", "0.00") else money(query[key])
        if "categoryIds" in query:
            require(isinstance(query["categoryIds"], list), "categoryIds 必须是分类 ID 数组")
            query["categoryIds"] = ",".join(member_id(value) for value in query["categoryIds"])
        for key in ("memberId", "creatorId"):
            if key in query:
                query[key] = member_or_all(query[key])
        endpoint = "/entries"
    else:
        require(set(query) <= {"granularity", "period"}, "统计只接受 granularity 和 period")
        require(query.get("granularity") in ("day", "month", "year"), "granularity 只能是 day、month 或 year")
        period = query.get("period", "")
        if query["granularity"] == "day":
            require(isinstance(period, str) and re.fullmatch(r"20[0-9]{2}-[0-9]{2}", period),
                    "日趋势需要 period=YYYY-MM")
        elif query["granularity"] == "month":
            require(isinstance(period, str) and re.fullmatch(r"20[0-9]{2}", period),
                    "月趋势需要 period=YYYY")
        else:
            require("period" not in query, "年趋势不接受 period")
        endpoint = "/reports"
    return client.request("GET", base + endpoint + "?" + urlencode(query))


if __name__ == "__main__":
    sys.exit(run(main))
