#!/usr/bin/env python3
"""[INPUT]: 外部鉴权配置。
[OUTPUT]: 当前账本有效记账人列表（memberId / userId / displayName）。
[POS]: 轻量独立查询；仅发两个 GET（账本 + recorders），不拉分类或账单数据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import sys
from _common import Client, run


def main():
    client = Client()
    ledger = client.ledger()
    recorders = client.request("GET", "ledgers/" + ledger["id"] + "/recorders")["recorders"]
    return {"ledger": ledger, "recorders": recorders}


if __name__ == "__main__":
    sys.exit(run(main))
