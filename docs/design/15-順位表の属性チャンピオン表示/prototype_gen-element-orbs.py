import json, base64, io, urllib.request, ssl
from PIL import Image, ImageDraw
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
SRC = {"FIRE":"absolving-flames","WIND":"adept-swordmaster","WATER":"acquiescing-rejection","LUXEM":"advent-of-the-shenju","UMBRA":"abnegation","CRUX":"beacon-knight","TERA":"acerbica","EXIA":"annihilation","ASTRA":"aethercloak-sentinel","ARCANE":"advent-of-the-stormcaller","NEOS":"aegis-of-dawn","NORM":"academy-attendant"}
cards = json.load(open("/workspaces/claude-test-vsc/tmp/api-cache/cards-snapshot.json"))
if isinstance(cards, dict): cards = cards.get("cards", cards.get("data"))
url_of = {}
for c in cards:
    for ed in (c.get("editions") or []):
        if ed.get("image"): url_of.setdefault(c["slug"], ed["image"]); break
out = {}
for el, slug in SRC.items():
    raw = urllib.request.urlopen(urllib.request.Request("https://api.gatcg.com"+url_of[slug], headers={"User-Agent":"Mozilla/5.0"}), context=ctx, timeout=30).read()
    im = Image.open(io.BytesIO(raw)).convert("RGBA"); w,h = im.size
    cx, cy, r = 449/500*w, 47/700*h, 22/500*w
    orb = im.crop((round(cx-r),round(cy-r),round(cx+r),round(cy+r))).resize((32,32), Image.LANCZOS)
    mask = Image.new("L",(32,32),0); ImageDraw.Draw(mask).ellipse((0,0,31,31),fill=255)
    orb.putalpha(mask)
    buf = io.BytesIO(); orb.save(buf,"WEBP",quality=80,method=6)
    out[el] = {"src": SRC[el], "b64": base64.b64encode(buf.getvalue()).decode()}
json.dump(out, open("orbs32.json","w"))
print("生成:", len(out), "属性 / 合計base64", sum(len(v["b64"]) for v in out.values())//1024, "KB")
