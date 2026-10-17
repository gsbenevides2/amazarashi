"""Grava a letra de uma música no admin (GET + PUT do objeto completo).

Uso:
    python3 put.py <songId> <arquivo.txt>

O arquivo tem uma linha por verso, no formato:
    startSecond | kana | romaji | pt

Deixe o campo startSecond VAZIO (linha começando com " | ") para
letra sem sincronia. O servidor grava startSecond nulo e o player
mostra a lista sem destacar nenhum verso.
"""
import sys, json, urllib.request

sid = sys.argv[1]
path = sys.argv[2]
raw = open(path, encoding="utf-8").read()
raw_lines = [l for l in raw.split("\n") if l.strip()]
base = "http://localhost:3000/api/admin/songs/"
row = json.load(urllib.request.urlopen(base + sid))

out = []
for l in raw_lines:
    parts = [p.strip() for p in l.split("|")]
    t = parts[0] if parts else ""
    rest = parts[1:]
    while len(rest) < 3:
        rest.append("")
    kana, romaji = rest[0], rest[1]
    pt = " | ".join(rest[2:])
    out.append(" | ".join([t, kana, romaji, pt]))

row["lyrics"] = "\n".join(out)
req = urllib.request.Request(
    base + sid,
    data=json.dumps(row).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="PUT",
)
resp = urllib.request.urlopen(req)
print(resp.status, resp.read().decode("utf-8"))
