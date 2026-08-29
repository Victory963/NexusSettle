"""x402-style USDC/USDT merchant: 402 challenge + Transfer-event verification.

Run:  python agents/a2a/python/server.py
Env:  RPC_URL, MERCHANT_ADDRESS, USDC_CONTRACT (optional; defaults Base Sepolia USDC)
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.request import urlopen

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"
PRICE = 50_000  # 0.05 USDC, 6 decimals
CONSUMED: set[str] = set()


def checksum(addr: str) -> str:
    return addr.lower()


def topic_addr(topic: str) -> str:
    return checksum("0x" + topic.replace("0x", "")[-40:])


def data_uint(data: str) -> int:
    return int(data, 16) if data else 0


def fetch_receipt(rpc: str, tx_hash: str) -> dict[str, Any]:
    body = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionReceipt", "params": [tx_hash]}
    ).encode()
    with urlopen(rpc, data=body, timeout=20) as resp:  # noqa: S310 — operator-configured RPC
        payload = json.loads(resp.read().decode())
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    return payload.get("result") or {}


def verify_usdc_transfer(receipt: dict[str, Any], token: str, pay_to: str, amount: int) -> bool:
    if int(receipt.get("status") or "0x0", 16) != 1:
        return False
    token = checksum(token)
    pay_to = checksum(pay_to)
    for log in receipt.get("logs") or []:
        topics = [t.lower() for t in log.get("topics") or []]
        if not topics or topics[0] != TRANSFER_TOPIC:
            continue
        if checksum(log.get("address", "")) != token:
            continue
        if len(topics) < 3:
            continue
        if topic_addr(topics[2]) == pay_to and data_uint(log.get("data") or "0x0") >= amount:
            return True
    return False


class Handler(BaseHTTPRequestHandler):
    merchant = checksum(os.getenv("MERCHANT_ADDRESS", "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"))
    token = checksum(os.getenv("USDC_CONTRACT", USDC_BASE_SEPOLIA))
    rpc = os.getenv("RPC_URL", "")

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
        return

    def _json(self, code: int, body: dict[str, Any], headers: dict[str, str] | None = None) -> None:
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?")[0] != "/api/v1/intel":
            self._json(404, {"error": "not found"})
            return
        tx_hash = self.headers.get("X-402-Tx-Hash")
        if not tx_hash:
            self._json(
                402,
                {"error": "Payment Required", "price_usdc": 0.05},
                {
                    "X-402-Pay-To": self.merchant,
                    "X-402-Amount-Token": str(PRICE),
                    "X-402-Asset-Id": "usdc",
                    "X-402-Network": "base-sepolia",
                    "X-402-Token": self.token,
                },
            )
            return
        if tx_hash in CONSUMED:
            self._json(400, {"error": "Tx Hash already consumed"})
            return
        if self.rpc:
            receipt = fetch_receipt(self.rpc, tx_hash)
            if not verify_usdc_transfer(receipt, self.token, self.merchant, PRICE):
                self._json(400, {"error": "Invalid USDC transfer event"})
                return
        CONSUMED.add(tx_hash)
        self._json(
            200,
            {
                "status": "success",
                "data": "Outcome-based pricing market trends: USDC-pinned Transfer logs, not ETH value.",
                "verified_by_tx": tx_hash,
                "onchain": bool(self.rpc),
            },
        )


def main() -> None:
    port = int(os.getenv("PORT", "8000"))
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"x402 USDC merchant on http://127.0.0.1:{port}/api/v1/intel")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
