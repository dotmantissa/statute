import json
import sys


def set_time(direct_vm, value):
    direct_vm.warp(value)
    gl_module = sys.modules.get("genlayer.gl")
    if gl_module is not None and getattr(gl_module, "message_raw", None) is not None:
        gl_module.message_raw["datetime"] = value
    message_module = sys.modules.get("genlayer.message")
    if message_module is not None and isinstance(getattr(message_module, "raw", None), dict):
        message_module.raw["datetime"] = value


def mock_json_prompt(direct_vm, pattern, value):
    direct_vm.mock_llm(pattern, json.dumps(json.dumps(value)))
