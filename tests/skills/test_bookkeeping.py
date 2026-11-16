"""[INPUT]: 可移植 CLI、临时私有文件和 loopback HTTP 替身。
[OUTPUT]: 真实进程的金额、身份、持久化、重试、重定向与配置隔离回归。
[POS]: 技能脚本集成测试，不连接生产服务或读取用户数据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import importlib.util
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import uuid4

SCRIPT = Path(__file__).resolve().parents[2] / "skills/daily-plenty-bookkeeping/scripts/_common.py"
spec = importlib.util.spec_from_file_location("bookkeeping", SCRIPT)
bookkeeping = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bookkeeping)


class BookkeepingTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.operation = Path(self.directory.name) / "lunch.json"
        self.ledger = {"id": str(uuid4()), "name": "测试账本", "timezone": "Asia/Shanghai"}
        self.category, self.payer, self.recorder, self.user = (str(uuid4()) for _ in range(4))
        self.raw = {"kind": "expense", "amount": "0.29", "categoryId": self.category,
                    "paidByMemberId": self.payer, "recordedByMemberId": self.recorder,
                    "occurredOn": "2026-11-16", "note": '牛肉汤 "小份"\n中文'}
        self.requests, self.posts, self.entries = [], [], {}
        self.patches, self.patch_cache = [], {}
        self.mode = "normal"
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def send(self, status, data):
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())

            def do_GET(self):
                owner.requests.append((self.path, self.headers.get("Authorization")))
                if self.path == "/api/ledgers":
                    ledger = dict(owner.ledger)
                    if self.headers.get("Authorization") == "Bearer other-ledger":
                        ledger["id"] = str(uuid4())
                    self.send(200, {"ledgers": [ledger]})
                elif "/data?" in self.path:
                    self.send(200, {"categories": [{"id": owner.category, "kind": "expense"}],
                                    "members": [{"id": owner.payer}, {"id": owner.recorder}],
                                    "entries": [{"note": "不应输出已有账单"}]})
                elif self.path.endswith("/recorders"):
                    self.send(200, {"recorders": [{"memberId": owner.recorder, "userId": owner.user,
                                                  "displayName": "小红"}]})
                elif "/entries?" in self.path:
                    self.send(200, {"entries": list(owner.entries.values()), "page": 1})
                elif "/entries/" in self.path:
                    entry = next((e for e in owner.entries.values() if e["id"] == self.path.rsplit("/", 1)[1]), None)
                    self.send(200 if entry else 404, entry or {})
                elif "/reports?" in self.path:
                    self.send(200, {"granularity": "month", "summary": {"expense": 29}})
                else:
                    self.send(404, {})

            def do_POST(self):
                payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                owner.posts.append(payload)
                if owner.mode == "redirect":
                    self.send_response(302)
                    self.send_header("Location", owner.base + "/leak")
                    self.end_headers()
                    return
                if isinstance(owner.mode, int):
                    self.send(owner.mode, {"error": "测试拒绝"})
                    return
                entry = {k: v for k, v in payload.items() if k not in ("recordedByMemberId", "requestId")}
                entry.update(id=str(uuid4()), ledgerId=owner.ledger["id"], createdBy=owner.user,
                             updatedBy=owner.user, source="ai", version=1)
                entry = owner.entries.setdefault(payload["requestId"], entry)
                if owner.mode == "lost":
                    self.connection.shutdown(socket.SHUT_RDWR)
                    self.connection.close()
                elif owner.mode == "truncated":
                    self.send_response(201)
                    self.send_header("Content-Length", "1000")
                    self.end_headers()
                    self.wfile.write(b'{"id":')
                elif owner.mode == "mismatch":
                    self.send(201, {**entry, "createdBy": str(uuid4())})
                else:
                    self.send(201, entry)

            def do_PATCH(self):
                payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                owner.patches.append((self.path, payload))
                if isinstance(owner.mode, int):
                    self.send(owner.mode, {})
                    return
                result = owner.patch_cache.get(payload["requestId"])
                if result is None:
                    pair = next(((key, entry) for key, entry in owner.entries.items()
                                 if entry["id"] == self.path.rsplit("/", 1)[1]), None)
                    if pair is None:
                        self.send(404, {})
                        return
                    key, previous = pair
                    if previous["source"] != "ai":
                        self.send(403, {})
                        return
                    if previous["version"] != payload["version"]:
                        self.send(409, {})
                        return
                    result = {**previous, **{k: v for k, v in payload.items() if k in bookkeeping.ENTRY_FIELDS},
                              "version": previous["version"] + 1, "updatedBy": owner.user}
                    owner.entries[key] = result
                    owner.patch_cache[payload["requestId"]] = result
                if owner.mode == "lost":
                    self.connection.shutdown(socket.SHUT_RDWR)
                    self.connection.close()
                elif owner.mode == "mismatch":
                    self.send(200, {**result, "id": str(uuid4())})
                else:
                    self.send(200, result)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.base = "http://127.0.0.1:" + str(self.server.server_port)
        self.env = {**os.environ, "DAILY_PLENTY_BASE_URL": self.base,
                    "DAILY_PLENTY_API_KEY": "test-private-key", "DAILY_PLENTY_LEDGER_ID": self.ledger["id"]}

    def cli(self, *args, data=None, env=None, success=True, script=None):
        if script is None:
            script = "query.py" if args[0] in ("context", "entries", "get", "reports") else "create.py"
            if args[0] == "entries":
                args = ("list", *args[1:])
        result = subprocess.run([sys.executable, "-B", str(SCRIPT.parent / script), *args],
                                input=json.dumps(data), text=True, capture_output=True,
                                env=self.env if env is None else env, timeout=10)
        self.assertEqual(result.returncode, 0 if success else 1, result.stdout + result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertNotIn("test-private-key", result.stdout)
        return json.loads(result.stdout)

    def prepare(self):
        return self.cli("prepare", "--operation", str(self.operation), data=self.raw)

    def submit(self, **kwargs):
        return self.cli("submit", "--operation", str(self.operation), **kwargs)

    def state(self):
        return self.cli("status", "--operation", str(self.operation), env={"PATH": os.environ["PATH"]})

    def test_exact_money_and_dates(self):
        for value, minor in [("0.29", 29), ("28.5", 2850), ("999999.99", 99999999)]:
            self.assertEqual(bookkeeping.money(value), minor)
        for value in [0.29, "1.001", "1e2", "-1", "0", "1000000", "NaN"]:
            with self.assertRaises(bookkeeping.Failure):
                bookkeeping.money(value)
        for value in ["2026-02-29", "1999-01-01", "2100-01-01"]:
            with self.assertRaises(bookkeeping.Failure):
                bookkeeping.occurred_on(value, "Asia/Shanghai")
        self.assertEqual(bookkeeping.occurred_on("2024-02-29", "Asia/Shanghai"), "2024-02-29")

    def test_context_prepare_submit_and_cached_result(self):
        data = self.cli("context", "--date", "yesterday")
        self.assertEqual(data["recorders"][0]["memberId"], self.recorder)
        self.assertNotIn("entries", data)
        self.assertTrue(all(auth == "Bearer test-private-key" for _, auth in self.requests))
        prepared = self.prepare()
        self.assertEqual(prepared["state"], "prepared")
        self.assertEqual(self.posts, [])
        original = self.operation.read_bytes()
        self.assertNotIn(self.base.encode(), original)
        self.assertNotIn(b"test-private-key", original)
        self.assertEqual(stat.S_IMODE(self.operation.stat().st_mode), 0o600)
        self.cli("prepare", "--operation", str(self.operation), data=self.raw, success=False)
        self.assertEqual(self.operation.read_bytes(), original)
        submitted = self.submit()
        self.assertEqual(submitted["entryId"], submitted["entry"]["id"])
        self.assertEqual(submitted["version"], 1)
        self.assertEqual(submitted["entry"]["amountMinor"], 29)
        self.assertEqual(submitted["entry"]["createdBy"], self.user)
        self.assertEqual(submitted["entry"]["paidByMemberId"], self.payer)
        self.assertEqual(submitted["entry"]["note"], self.raw["note"])
        self.assertTrue(self.submit()["cached"])
        self.assertEqual(len(self.posts), 1)
        self.assertEqual(self.state()["state"], "succeeded")

    def test_lost_response_retry_keeps_request_after_key_rotation(self):
        self.prepare()
        self.mode = "lost"
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "unknown")
        self.mode = "normal"
        self.submit(env={**self.env, "DAILY_PLENTY_API_KEY": "rotated-private-key"})
        self.assertEqual(self.posts[0], self.posts[1])
        self.assertEqual(len(self.entries), 1)
        self.assertEqual(self.state()["state"], "succeeded")

    def test_redirect_and_wrong_recorder_never_report_success(self):
        self.prepare()
        self.mode = "redirect"
        self.submit(success=False)
        self.assertFalse(any(path == "/leak" for path, _ in self.requests))
        self.assertEqual(self.state()["state"], "unknown")
        self.mode = "truncated"
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "unknown")
        self.mode = "mismatch"
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "unknown")

    def test_changed_target_ledger_or_payload_cannot_send(self):
        self.prepare()
        self.submit(env={**self.env, "DAILY_PLENTY_BASE_URL": self.base.replace("127.0.0.1", "localhost")}, success=False)
        self.submit(env={**self.env, "DAILY_PLENTY_API_KEY": "other-ledger"}, success=False)
        operation = json.loads(self.operation.read_text())
        operation["payload"]["amountMinor"] = 3000
        self.operation.write_text(json.dumps(operation))
        self.submit(success=False)
        self.assertEqual(self.posts, [])

    def test_invalid_candidate_and_failed_persistence_do_not_post(self):
        self.raw["recordedByMemberId"] = str(uuid4())
        self.cli("prepare", "--operation", str(self.operation), data=self.raw, success=False)
        self.raw["recordedByMemberId"] = self.recorder
        missing_parent = Path(self.directory.name) / "missing/operation.json"
        self.cli("prepare", "--operation", str(missing_parent), data=self.raw, success=False)
        self.cli("prepare", "--operation", str(SCRIPT.parent / "operation.json"), data=self.raw, success=False)
        self.assertEqual(self.posts, [])

    def test_rejections_and_uncertainty_survive_http_errors(self):
        self.prepare()
        self.mode = 401
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "unknown")
        self.mode = 409
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "unknown", "retry failure cannot disprove earlier commit")
        self.operation = Path(self.directory.name) / "new.json"
        self.prepare()
        self.mode = 400
        self.submit(success=False)
        self.assertEqual(self.state()["state"], "rejected")
        count = len(self.posts)
        self.submit(success=False)
        self.assertEqual(len(self.posts), count)

    def test_entries_url_encodes_search_as_data(self):
        self.cli("entries", data={"search": "牛肉汤 & 小份", "page": 2})
        path = self.requests[-1][0]
        self.assertIn("%26", path)
        self.assertTrue(path.endswith("page=2"))


    def new_entry(self):
        self.prepare()
        return self.submit()

    def prepare_update(self, entry_id, changes, success=True):
        path = Path(self.directory.name) / "update.json"
        return self.cli("prepare", "--entry-id", entry_id, "--operation", str(path),
                        data={"updatedByMemberId": self.recorder, **changes}, script="update.py", success=success)

    def update_submit(self, **kwargs):
        return self.cli("submit", "--operation", str(Path(self.directory.name) / "update.json"), script="update.py", **kwargs)

    def test_create_query_and_update_by_returned_id_preserves_untouched_fields(self):
        original = self.new_entry()
        detail = self.cli("get", "--entry-id", original["entryId"])
        self.assertEqual(detail["entry"], original["entry"])
        prepared = self.prepare_update(original["entryId"], {"amount": "30.50", "version": original["version"]})
        self.assertEqual(self.patches, [])
        self.assertEqual(prepared["payload"]["amountMinor"], 3050)
        updated = self.update_submit()
        self.assertEqual(updated["entryId"], original["entryId"])
        self.assertEqual(updated["version"], 2)
        for field in ["note", "kind", "categoryId", "paidByMemberId", "occurredOn", "createdBy", "source"]:
            self.assertEqual(updated["entry"][field], original["entry"][field])
        self.assertTrue(self.update_submit()["cached"])
        self.assertEqual(len(self.patches), 1)
        self.assertEqual(len(self.entries), 1)
        self.assertEqual(len(self.posts), 1)
        status = self.cli("status", "--operation", str(Path(self.directory.name) / "update.json"),
                          script="update.py", env={"PATH": os.environ["PATH"]})
        self.assertEqual(status["entryId"], original["entryId"])
        self.assertEqual(status["version"], 2)

    def test_update_unknown_response_retries_same_patch_after_key_rotation(self):
        original = self.new_entry()
        self.prepare_update(original["entryId"], {"note": "纠正备注"})
        self.mode = "lost"
        self.update_submit(success=False)
        self.mode = "normal"
        updated = self.update_submit(env={**self.env, "DAILY_PLENTY_API_KEY": "rotated-private-key"})
        self.assertEqual(self.patches[0], self.patches[1])
        self.assertEqual(updated["version"], 2)
        self.assertEqual(len(self.entries), 1)

    def test_update_rejects_manual_unknown_id_stale_context_and_forged_source(self):
        original = self.new_entry()
        self.prepare_update(str(uuid4()), {"note": "不存在"}, success=False)
        self.prepare_update(original["entryId"], {"source": "ai", "note": "伪造"}, success=False)
        self.prepare_update(original["entryId"], {"version": 99, "note": "过期"}, success=False)
        next(iter(self.entries.values()))["source"] = "manual"
        self.prepare_update(original["entryId"], {"note": "不允许"}, success=False)
        self.assertEqual(self.patches, [])
        self.assertFalse((Path(self.directory.name) / "update.json").exists())

    def test_update_target_tampering_wrong_script_and_version_conflict_never_overwrite(self):
        original = self.new_entry()
        self.prepare_update(original["entryId"], {"amount": "30"})
        path = Path(self.directory.name) / "update.json"
        self.cli("submit", "--operation", str(path), success=False)
        saved = path.read_text()
        changed = json.loads(saved)
        changed["entryId"] = str(uuid4())
        path.write_text(json.dumps(changed))
        self.update_submit(success=False)
        self.assertEqual(self.patches, [])
        path.write_text(saved)
        next(iter(self.entries.values()))["version"] = 2
        result = self.update_submit(success=False)
        self.assertEqual(result["httpStatus"], 409)
        self.assertEqual(json.loads(path.read_text())["state"], "rejected")
        count = len(self.patches)
        self.update_submit(success=False)
        self.assertEqual(len(self.patches), count)
        self.assertEqual(next(iter(self.entries.values()))["amountMinor"], 29)

    def test_legacy_create_operation_resumes_with_new_create_script(self):
        self.prepare()
        operation = json.loads(self.operation.read_text())
        legacy = {key: operation[key] for key in ("target", "ledgerId", "payload", "state")}
        legacy.update(version=1, recorderUserId=self.user)
        legacy["fingerprint"] = bookkeeping.fingerprint(legacy)
        self.operation.write_text(json.dumps(legacy))
        result = self.submit()
        self.assertEqual(result["entryId"], result["entry"]["id"])
        self.assertEqual(result["version"], 1)
        self.assertEqual(self.posts[0]["requestId"], operation["payload"]["requestId"])

    def test_update_wrong_response_id_is_not_success(self):
        original = self.new_entry()
        self.prepare_update(original["entryId"], {"note": "修正"})
        self.mode = "mismatch"
        self.update_submit(success=False)
        path = Path(self.directory.name) / "update.json"
        self.assertEqual(json.loads(path.read_text())["state"], "unknown")
        self.mode = "normal"
        self.assertEqual(self.update_submit()["entryId"], original["entryId"])

    def test_queries_cover_amount_dates_categories_pagination_and_reports(self):
        self.cli("entries", data={"start": "today", "end": "today", "minAmount": "0", "maxAmount": "28.50",
                                  "categoryIds": [self.category], "memberId": self.payer, "creatorId": self.user,
                                  "kind": "expense", "sort": "amount_desc", "page": 2})
        path = self.requests[-1][0]
        self.assertIn("maxAmount=2850", path)
        self.assertIn("minAmount=0", path)
        self.assertIn("categoryIds=" + self.category, path)
        self.assertNotIn("today", path)
        self.assertTrue(path.endswith("page=2"))
        result = self.cli("reports", data={"granularity": "month", "period": "2026"})
        self.assertEqual(result["summary"]["expense"], 29)
        self.cli("entries", data={"minAmount": 28.5}, success=False)
        self.assertEqual(self.posts, [])
        self.assertEqual(self.patches, [])


if __name__ == "__main__":
    unittest.main()
