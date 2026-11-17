"""把 Three.js 与游戏源码内联进单文件 3d.html（零外部依赖）。"""
from pathlib import Path

root = Path(__file__).parent
shell = (root / "src" / "3d-shell.html").read_text(encoding="utf-8")
three = (root / "vendor" / "three.min.js").read_text(encoding="utf-8")
game = (root / "src" / "3d-game.js").read_text(encoding="utf-8")

assert "</script" not in three.lower(), "three.min.js 含有脚本结束标记"
assert "/*__THREE__*/" in shell and "/*__GAME__*/" in shell

out = shell.replace("/*__THREE__*/", three).replace("/*__GAME__*/", game)
(root / "3d.html").write_text(out, encoding="utf-8")
print(f"生成 3d.html：{len(out):,} 字符")
