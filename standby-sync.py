"""Run on a computer connected to EGAT: python -m pip install requests beautifulsoup4"""
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

ORIGIN = "https://radomboonbank.github.io"
HOME = "https://ts.egat.co.th/"
HOST = "127.0.0.1:48317"
lock = Lock()


def directory():
    with requests.Session() as session:
        def read(url):
            if urlsplit(url).hostname not in {"ts.egat.co.th", "ts-a1.egat.co.th"} or urlsplit(url).scheme != "https":
                raise ValueError("ลิงก์ในสารบบไม่ตรงกับเว็บ กฟผ.")
            response = session.get(url, timeout=25)
            response.raise_for_status()
            return BeautifulSoup(response.content, "html.parser", from_encoding="utf-8")

        def link(page, label):
            for a in page.select("a[href]"):
                if a.get_text(strip=True) == label:
                    return a["href"]
            raise ValueError("ไม่พบเมนู " + label)

        wrapper = urljoin(HOME, link(read(HOME), "ข้อมูลบุคลากรสายงาน"))
        frame = urljoin(wrapper, read(wrapper).select_one("iframe#blockrandom")["src"])
        chart = read(frame)
        unit = next(a for a in chart.select("a[onclick]") if a.get_text(strip=True) == "อปก.")
        code = re.fullmatch(r"showMenu\('([A-Z0-9]+)'\);?", unit["onclick"]).group(1)
        menu = urljoin(frame, "deptmenu.php?dept=" + code)
        url = urljoin(menu, link(read(menu), "แสดงรายชื่อบุคคลทั้งหมดของหน่วยงาน"))
        rows, pages, total, seen = [], 0, None, set()
        while True:
            page = read(url)
            table = page.select_one("#tbl_Employeelist")
            count = re.search(r"Records\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)", page.get_text(" ", strip=True))
            if table is None or count is None:
                raise ValueError("ไม่พบตารางหรือจำนวนรายชื่อ อปก.")
            start, end, reported = map(int, count.groups())
            if start != len(rows) + 1 or not start <= end <= reported or total not in (None, reported):
                raise ValueError("จำนวนรายชื่อหรือช่วงหน้ามีการเปลี่ยนแปลง กรุณาซิงก์ใหม่")
            total = reported
            headers = [c.get_text(" ", strip=True) for c in table.select("tr.ewTableHeader > td, tr.ewTableHeader > th")]
            columns = [headers.index(label) for label in ("รหัสพนักงาน", "ชื่อ - สกุล", "ตำแหน่ง", "หน่วยงาน")]
            for sequence in table.select('td.ewListOptionBody[data-name="sequence"]'):
                if sequence.get_text(strip=True) != str(len(rows) + 1) + ".":
                    raise ValueError("ลำดับแถวในเว็บไม่ต่อเนื่อง")
                cells = sequence.parent.find_all("td", recursive=False)
                for el in sequence.parent.select('[style*="display: none"], [style*="display:none"]'):
                    el.decompose()
                values = [" ".join(cells[i].get_text("", strip=False).split()) for i in columns]
                emp, name, position, department = values
                if not re.fullmatch(r"[0-9]+", emp) or not name or emp in seen:
                    raise ValueError("พบรหัสพนักงานซ้ำหรือข้อมูลไม่ครบในเว็บ")
                seen.add(emp)
                rows.append(values)
            if len(rows) != end:
                raise ValueError("อ่านจำนวนแถวในหน้าไม่ครบ")
            pages += 1
            if end == total:
                return {"rows": rows, "pages": pages, "total": total}
            url = urljoin(url, link(page, "Next")) + "&type=list&dept=" + code + "&criteria="


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def allowed(self):
        return self.path == "/directory" and self.headers.get("Host") == HOST and self.headers.get("Origin") == ORIGIN

    def respond(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        if self.allowed():
            self.send_header("Access-Control-Allow-Origin", ORIGIN)
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "X-Standby-Sync")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.respond(200 if self.allowed() else 403, {})

    def do_POST(self):
        if not self.allowed() or self.headers.get("X-Standby-Sync") != "1":
            return self.respond(403, {})
        if not lock.acquire(blocking=False):
            return self.respond(409, {"error": "กำลังอ่านรายชื่อในอีกหน้าต่าง"})
        try:
            result = directory()
        except Exception as exc:
            self.respond(502, {"error": str(exc) if isinstance(exc, ValueError) else "อ่านสารบบไม่ครบ กรุณาตรวจเครือข่าย กฟผ. หรือ VPN"})
        else:
            self.respond(200, result)
        finally:
            lock.release()


if __name__ == "__main__":
    print("Sync2Web ready on 127.0.0.1:48317. Keep this window open while syncing.", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 48317), Handler).serve_forever()
