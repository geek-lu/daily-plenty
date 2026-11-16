#!/usr/bin/env python3
"""[INPUT]: 外部环境配置、结构化 JSON、HTTP API 和技能目录外的操作文件。
[OUTPUT]: HTTP、字段校验（含 member_or_all）、私有操作文件和新增/修改的幂等提交；
          context 可接受已有账本跳过重复请求；resolve_recorder 返回录入/修改人 userId。
[POS]: 独立 Python 3.9+ 标准库 CLI；不导入应用源码，不推断说话人身份。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from datetime import date, datetime, timedelta
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class Failure(Exception):
    def __init__(self, code, message, status=None):
        super().__init__(message)
        self.code, self.status = code, status


def require(condition, message):
    if not condition:
        raise Failure("INVALID_INPUT", message)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self):
        self.base = os.environ.get("DAILY_PLENTY_BASE_URL", "").rstrip("/")
        self.token = os.environ.get("DAILY_PLENTY_API_KEY", "")
        parts = urlsplit(self.base)
        require(parts.scheme in ("http", "https") and parts.hostname
                and not parts.username and not parts.password
                and not parts.query and not parts.fragment and not parts.path,
                "请在宿主私有配置设置 DAILY_PLENTY_BASE_URL 为应用根地址")
        require(bool(self.token) and not re.search(r"\s", self.token),
                "请在宿主私有配置设置 DAILY_PLENTY_API_KEY")
        self.target = hashlib.sha256(self.base.encode()).hexdigest()
        self.opener = build_opener(NoRedirect())

    def request(self, method, path, payload=None):
        body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode()
        request = Request(self.base + "/api/" + path, data=body, method=method,
                          headers={"Authorization": "Bearer " + self.token,
                                   "Content-Type": "application/json"})
        try:
            with self.opener.open(request, timeout=30) as response:
                expected = 201 if method == "POST" else 200
                if response.status != expected:
                    raise Failure("UNEXPECTED_RESPONSE", "响应状态不符合接口契约")
                result = json.load(response)
                if not isinstance(result, dict):
                    raise Failure("UNEXPECTED_RESPONSE", "响应不是 JSON 对象")
                return result
        except HTTPError as error:
            # 不回显响应正文或 URL，避免凭据/服务目标进入错误日志。
            error.close()
            raise Failure("HTTP_ERROR", "接口返回 HTTP " + str(error.code), error.code) from None
        except (URLError, OSError, HTTPException, ValueError):
            raise Failure("TRANSPORT_ERROR", "网络失败或响应无法解析，请保留原操作文件") from None

    def ledger(self):
        ledgers = self.request("GET", "ledgers").get("ledgers", [])
        require(len(ledgers) == 1, "共享密钥应只返回一个账本，请检查配置")
        ledger = ledgers[0]
        expected = os.environ.get("DAILY_PLENTY_LEDGER_ID")
        require(not expected or ledger["id"] == expected, "密钥账本与预期账本不一致")
        return ledger


def money(value):
    require(isinstance(value, str) and re.fullmatch(r"[0-9]{1,6}(?:\.[0-9]{1,2})?", value),
            "amount 必须为人民币元的十进制字符串，最多两位小数")
    whole, _, fraction = value.partition(".")
    result = int(whole) * 100 + int(fraction.ljust(2, "0"))
    require(1 <= result <= 99_999_999, "金额必须为 0.01–999999.99 元")
    return result


def occurred_on(value, timezone):
    if value in ("today", "yesterday"):
        try:
            now = datetime.now(ZoneInfo(timezone)).date()
        except ZoneInfoNotFoundError:
            raise Failure("TIMEZONE_UNAVAILABLE", "本机缺少账本时区数据，请安装系统时区数据库") from None
        value = (now - timedelta(days=value == "yesterday")).isoformat()
    require(isinstance(value, str) and re.fullmatch(r"20[0-9]{2}-[0-9]{2}-[0-9]{2}", value),
            "日期必须为 today、yesterday 或 2000–2099 年的 YYYY-MM-DD")
    try:
        date.fromisoformat(value)
    except ValueError:
        raise Failure("INVALID_INPUT", "日期不存在") from None
    return value


def member_id(value):
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise Failure("INVALID_INPUT", "账单、分类和成员必须使用实际响应的 UUID") from None


def context(client, when, ledger=None):
    if ledger is None:
        ledger = client.ledger()
    day = occurred_on(when, ledger["timezone"])
    base = "ledgers/" + ledger["id"]
    data = client.request("GET", base + "/data?" + urlencode({"month": day[:7]}))
    recorders = client.request("GET", base + "/recorders")["recorders"]
    return {"ledger": ledger, "occurredOn": day, "recorders": recorders,
            "categories": [c for c in data["categories"] if not c.get("archivedAt")],
            "members": [m for m in data["members"] if not m.get("leftAt")]}


def operation_path(value):
    path = Path(value).expanduser().resolve()
    skill = Path(__file__).resolve().parent.parent
    require(path != skill and skill not in path.parents, "操作文件必须保存在技能目录外")
    return path


def save(path, data, new=False):
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if new:
        # O_EXCL 保证不会为已有操作覆盖 requestId；创建失败时不发送写请求。
        with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        return
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".bookkeeping-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def read_json(path):
    if path == "-":
        return json.load(sys.stdin)
    return json.loads(Path(path).read_text(encoding="utf-8"))


ENTRY_FIELDS = {"kind", "amountMinor", "categoryId", "paidByMemberId", "occurredOn", "note"}
INPUT_FIELDS = {"kind", "amount", "categoryId", "paidByMemberId", "occurredOn", "note"}


def parse_fields(raw, timezone):
    require(raw["kind"] in ("expense", "income"), "kind 只能是 expense 或 income")
    note = raw.get("note", "")
    require(isinstance(note, str), "note 必须为文本")
    note = note.strip()
    require(len(note.encode("utf-16-le")) // 2 <= 120, "备注最多 120 个 UTF-16 字符")
    return {"kind": raw["kind"], "amountMinor": money(raw["amount"]), "note": note,
            "occurredOn": occurred_on(raw["occurredOn"], timezone),
            **{key: member_id(raw[key]) for key in ("categoryId", "paidByMemberId")}}


def member_or_all(value):
    if value == "all":
        return "all"
    return member_id(value)


def resolve_recorder(data, member):
    selected = next((m for m in data["recorders"] if m["memberId"] == member_id(member)), None)
    require(selected is not None, "录入/修改人不在有效候选中，请重新匹配")
    return selected["userId"]


def validate_links(data, payload, previous=None):
    previous = previous or {}
    # context 只返回活跃候选；修改时允许保留原先的归档分类和离开成员。
    require((payload["categoryId"] == previous.get("categoryId") and payload["kind"] == previous.get("kind"))
            or any(c["id"] == payload["categoryId"] and c["kind"] == payload["kind"] for c in data["categories"]),
            "分类不属于当前账本或收支类型不匹配")
    require(payload["paidByMemberId"] == previous.get("paidByMemberId")
            or any(m["id"] == payload["paidByMemberId"] for m in data["members"]),
            "付款人不属于当前有效成员")


def fingerprint(operation):
    keys = ("target", "ledgerId", "recorderUserId", "payload") if operation["version"] == 1 else (
        "action", "entryId", "target", "ledgerId", "payload", "expected")
    fixed = {key: operation[key] for key in keys}
    return hashlib.sha256(json.dumps(fixed, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def prepare_operation(client, path, action, ledger, payload, expected, entry_id=None):
    payload = {**payload, "requestId": str(uuid4())}
    operation = {"version": 2, "action": action, "entryId": entry_id, "target": client.target,
                 "ledgerId": ledger["id"], "payload": payload, "expected": expected, "state": "prepared"}
    operation["fingerprint"] = fingerprint(operation)
    save(path, operation, new=True)
    return {"state": "prepared", "action": action, "entryId": entry_id, "operation": str(path),
            "ledger": ledger, "payload": payload}


def load_operation(path):
    operation = read_json(path)
    require(operation["version"] in (1, 2) and operation["fingerprint"] == fingerprint(operation),
            "操作文件已变更，请勿修改已准备请求")
    return operation


def submit(client, path, action):
    operation = load_operation(path)
    require(operation.get("action", "create") == action, "操作文件类型与脚本不匹配")
    require(operation["target"] == client.target, "服务目标已改变，不能提交旧操作")
    ledger = client.ledger()
    require(operation["ledgerId"] == ledger["id"], "账本已改变，不能提交旧操作")
    if operation["state"] == "succeeded":
        return result_entry(operation["entry"], True)
    if operation["state"] == "rejected":
        raise Failure("REJECTED_OPERATION", "此操作已被拒绝；先核对原因，不自动重新生成请求")
    # 写入 pending 后才发送；崩溃、超时及丢响应均使用同一份 payload 恢复。
    was_uncertain = operation["state"] in ("pending", "unknown")
    operation["state"] = "pending"
    save(path, operation)
    try:
        endpoint = "ledgers/" + operation["ledgerId"] + "/entries"
        if action == "update":
            endpoint += "/" + member_id(operation["entryId"])
        entry = client.request("PATCH" if action == "update" else "POST", endpoint, operation["payload"])
        expected = {k: v for k, v in operation["payload"].items() if k in ENTRY_FIELDS}
        expected.update(ledgerId=operation["ledgerId"])
        expected.update(operation.get("expected", {"createdBy": operation.get("recorderUserId")}))
        if (not entry.get("id") or type(entry.get("version")) is not int or entry["version"] < 1
                or any(entry.get(k) != v for k, v in expected.items())):
            raise Failure("RESPONSE_MISMATCH", "服务端返回与原请求不一致，结果需人工核对")
    except Failure as error:
        rejected = not was_uncertain and error.status in (400, 404, 409, 422)
        operation.update(state="rejected" if rejected else "unknown", error={"code": error.code, "httpStatus": error.status})
        save(path, operation)
        raise
    operation.update(state="succeeded", entry=entry)
    operation.pop("error", None)
    save(path, operation)
    return result_entry(entry, False)


def result_entry(entry, cached=False):
    return {"state": "succeeded", "entryId": entry["id"], "version": entry["version"],
            "entry": entry, "cached": cached}


def mutation_main(action, prepare):
    parser = argparse.ArgumentParser(description="日日有余：" + action)
    commands = parser.add_subparsers(dest="command", required=True)
    draft = commands.add_parser("prepare", help="校验并保存请求，不写服务端账单")
    draft.add_argument("--input", default="-")
    draft.add_argument("--operation", required=True)
    if action == "update":
        draft.add_argument("--entry-id", required=True)
    for name in ("submit", "status"):
        commands.add_parser(name).add_argument("--operation", required=True)
    args = parser.parse_args()
    path = operation_path(args.operation)
    if args.command == "status":
        operation = load_operation(path)
        require(operation.get("action", "create") == action, "操作文件类型与脚本不匹配")
        if operation["state"] == "succeeded":
            return {**operation, **result_entry(operation["entry"], True)}
        return operation
    client = Client()
    if args.command == "submit":
        return submit(client, path, action)
    require(not path.exists(), "操作文件已存在；重试请 submit，查询请 status")
    raw = read_json(args.input)
    if action == "update":
        return prepare(client, raw, path, member_id(args.entry_id))
    return prepare(client, raw, path)


def run(main):
    try:
        print(json.dumps({"ok": True, **main()}, ensure_ascii=False))
        return 0
    except Failure as error:
        print(json.dumps({"ok": False, "code": error.code, "error": str(error), "httpStatus": error.status}, ensure_ascii=False))
    except (OSError, ValueError, KeyError, TypeError):
        print(json.dumps({"ok": False, "code": "LOCAL_ERROR", "error": "文件、输入或响应结构无效；请保留原操作文件并检查 status"}, ensure_ascii=False))
    return 1
