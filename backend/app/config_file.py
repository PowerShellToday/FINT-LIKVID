import json
import os
from pathlib import Path

CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", "/app/data/config.json"))


def _read() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def get_encryption_key() -> bytes:
    return _read()["encryption_key"].encode()
