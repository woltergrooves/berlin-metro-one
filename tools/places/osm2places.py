#!/usr/bin/env python3
"""Berlin Life — buurtpakketten voor het Street View-scherm (StreetScreen).

Per station: echte plekken (Späti, bakker, Imbiss, café, bar, club, winkels, bezienswaardigheden, parken)
en een eenvoudige kaart (straten, parken, water) uit OpenStreetMap, rond de echte haltecoördinaten.

Gebruik:
  python3 -I tools/places/osm2places.py fetch <repo> <cachemap>      # haalt OSM-uitsneden op (api.openstreetmap.org)
  python3 -I tools/places/osm2places.py build <repo> <cachemap>      # schrijft public/assets/places/<key>.json

Stations: U1 uit src/data/u1.js, U2 en U8 uit src/systems/Phase67RestoreV2.js (zelfde coördinaten als Street View).
<key> = genormaliseerde stationsnaam (zoals StreetCoreClean: kleine letters, zonder accenten, ß→ss, alleen a-z0-9).
Kaartgegevens © OpenStreetMap-bijdragers (ODbL).
"""
import json, math, os, re, sys, time, unicodedata, urllib.request
import xml.etree.ElementTree as ET

R = 230          # straal van de kaart (m)
POI_R = 260      # zoekstraal plekken (m)


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('ß', 'ss')
    return re.sub(r'[^a-z0-9]+', '', s)


def stations(repo):
    out = {}
    u1 = open(os.path.join(repo, 'src/data/u1.js'), encoding='utf-8').read()
    for name, lat, lon in re.findall(r"\['[a-z-]+',\s*'([^']+)',\s*([\d.]+),\s*([\d.]+)", u1):
        out.setdefault(norm(name), {'name': name, 'lat': float(lat), 'lon': float(lon), 'lines': set()})['lines'].add('U1')
    p67 = open(os.path.join(repo, 'src/systems/Phase67RestoreV2.js'), encoding='utf-8').read()
    for line in ('U2', 'U8'):
        m = re.search(r'const %s=\{(.*?)\};' % line, p67, re.S)
        for name, lat, lon in re.findall(r"'([^']+)':\[([\d.]+),([\d.]+)\]", m.group(1)):
            k = norm(name)
            if k in out:
                out[k]['lines'].add(line)
            else:
                out[k] = {'name': name, 'lat': float(lat), 'lon': float(lon), 'lines': {line}}
    return out


def bbox(st, r=max(R, POI_R) + 40):
    dlat = r / 111320
    dlon = r / (111320 * math.cos(math.radians(st['lat'])))
    return st['lon'] - dlon, st['lat'] - dlat, st['lon'] + dlon, st['lat'] + dlat


def fetch(repo, cache):
    os.makedirs(cache, exist_ok=True)
    for k, st in sorted(stations(repo).items()):
        path = os.path.join(cache, k + '.osm')
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            continue
        a, b, c, d = bbox(st)
        url = f'https://api.openstreetmap.org/api/0.6/map?bbox={a:.6f},{b:.6f},{c:.6f},{d:.6f}'
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'BerlinLife-places/1 (game asset build)'})
                data = urllib.request.urlopen(req, timeout=90).read()
                open(path, 'wb').write(data)
                print('ok', k, len(data))
                break
            except Exception as e:
                print('retry', k, e)
                time.sleep(3)
        time.sleep(1)


# Soorten plekken: (soort, test op tags). Volgorde = prioriteit.
KINDS = [
    ('spati', lambda t: t.get('shop') in ('convenience', 'kiosk', 'beverages') ),
    ('super', lambda t: t.get('shop') in ('supermarket',)),
    ('bakery', lambda t: t.get('shop') in ('bakery', 'pastry')),
    ('imbiss', lambda t: t.get('amenity') == 'fast_food'),
    ('cafe', lambda t: t.get('amenity') in ('cafe', 'ice_cream')),
    ('restaurant', lambda t: t.get('amenity') == 'restaurant'),
    ('club', lambda t: t.get('amenity') == 'nightclub'),
    ('bar', lambda t: t.get('amenity') in ('bar', 'pub', 'biergarten')),
    ('mall', lambda t: t.get('shop') in ('department_store', 'mall')),
    ('clothes', lambda t: t.get('shop') in ('clothes', 'second_hand', 'shoes', 'fashion_accessories')),
    ('books', lambda t: t.get('shop') in ('books', 'music', 'records')),
    ('culture', lambda t: t.get('amenity') in ('theatre', 'cinema', 'arts_centre') or t.get('tourism') in ('museum', 'gallery')),
    ('sight', lambda t: t.get('tourism') in ('attraction', 'artwork', 'viewpoint') or 'historic' in t
                      or (t.get('amenity') == 'place_of_worship' and 'name' in t) or t.get('memorial')),
    ('park', lambda t: t.get('leisure') in ('park', 'garden')),
    ('market', lambda t: t.get('amenity') == 'marketplace'),
]
# Hoeveel per soort, maximaal.
CAP = {'mall': 1, 'spati': 2, 'super': 1, 'bakery': 1, 'imbiss': 2, 'cafe': 2, 'restaurant': 1, 'club': 1, 'bar': 2,
       'clothes': 1, 'books': 1, 'culture': 2, 'sight': 4, 'park': 1, 'market': 1}
KEEP = ('opening_hours', 'cuisine', 'wikipedia', 'wikidata', 'description', 'start_date', 'inscription',
        'architect', 'artist_name', 'historic', 'memorial', 'tourism', 'heritage', 'website', 'operator')
ROADS = {'primary': 4, 'secondary': 3, 'tertiary': 3, 'residential': 2, 'living_street': 2,
         'pedestrian': 2, 'unclassified': 2, 'trunk': 4, 'footway': 1, 'service': 1}


def build(repo, cache):
    outdir = os.path.join(repo, 'public/assets/places')
    os.makedirs(outdir, exist_ok=True)
    index = {}
    for k, st in sorted(stations(repo).items()):
        path = os.path.join(cache, k + '.osm')
        if not os.path.exists(path):
            print('mist', k)
            continue
        root = ET.parse(path).getroot()
        lat0, lon0 = st['lat'], st['lon']
        cos0 = math.cos(math.radians(lat0))
        nodes = {}
        for n in root.iter('node'):
            nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')))

        def xy(lat, lon):
            return round((lon - lon0) * 111320 * cos0, 1), round((lat - lat0) * 111320, 1)

        tagged = []
        for el in list(root.iter('node')) + list(root.iter('way')):
            t = {g.get('k'): g.get('v') for g in el.findall('tag')}
            if not t:
                continue
            if el.tag == 'node':
                lat, lon = float(el.get('lat')), float(el.get('lon'))
                ring = None
            else:
                pts = [nodes[r.get('ref')] for r in el.findall('nd') if r.get('ref') in nodes]
                if not pts:
                    continue
                lat, lon = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
                ring = pts
            tagged.append((el.tag, t, lat, lon, ring))

        # Plekken
        cand = {}
        seen = set()
        for tag, t, lat, lon, ring in tagged:
            name = t.get('name')
            if not name:
                continue
            kind = next((kd for kd, f in KINDS if f(t)), None)
            if not kind:
                continue
            x, y = xy(lat, lon)
            d = math.hypot(x, y)
            if d > POI_R:
                continue
            key = (kind, name.lower())
            if key in seen:
                continue
            seen.add(key)
            extra = {kk: t[kk] for kk in KEEP if kk in t}
            if t.get('memorial') == 'stolperstein':
                extra['stolperstein'] = 1
                name = 'Stolperstein ' + name
            cand.setdefault(kind, []).append({'name': name, 'kind': kind, 'x': x, 'y': y, 'd': round(d),
                                              'lat': round(lat, 6), 'lon': round(lon, 6), **extra})
        places = []
        for kind, lst in cand.items():
            lst.sort(key=lambda p: (1 if p.get('stolperstein') else 0, 0 if p.get('wikipedia') or p.get('wikidata') else 1, p['d']) if kind in ('sight', 'culture', 'park') else (p['d'],))
            if kind == 'sight':
                main = [p for p in lst if not p.get('stolperstein')][:3]
                stol = [p for p in lst if p.get('stolperstein')][:1]
                places += main + stol
            else:
                places += lst[:CAP.get(kind, 1)]
        places.sort(key=lambda p: p['d'])

        # Kaart: straten, parken, water (vereenvoudigd, in meters t.o.v. de halte)
        def simplify(pts, tol=3.0):
            if len(pts) < 3:
                return pts
            out = [pts[0]]
            for p in pts[1:-1]:
                if math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) >= tol:
                    out.append(p)
            out.append(pts[-1])
            return out

        roads, green, water = [], [], []
        for tag, t, lat, lon, ring in tagged:
            if tag != 'way' or not ring:
                continue
            pts = [xy(a, b) for a, b in ring]
            if all(abs(px) > R + 60 or abs(py) > R + 60 for px, py in pts):
                continue
            pts = [[round(px), round(py)] for px, py in simplify(pts)]
            hw = t.get('highway')
            if hw in ROADS:
                roads.append({'w': ROADS[hw], 'p': pts, **({'n': t['name']} if 'name' in t and ROADS[hw] >= 3 else {})})
            elif t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'recreation_ground') or t.get('natural') == 'wood':
                green.append(pts)
            elif t.get('natural') == 'water' or t.get('waterway') in ('canal', 'river', 'riverbank'):
                water.append({'p': pts, 'line': t.get('waterway') in ('canal', 'river')})
        pack = {'station': st['name'], 'lines': sorted(st['lines']), 'lat': lat0, 'lon': lon0, 'r': R,
                'places': places, 'roads': roads, 'green': green, 'water': water,
                'credit': '© OpenStreetMap-bijdragers'}
        with open(os.path.join(outdir, k + '.json'), 'w', encoding='utf-8') as f:
            json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
        index[k] = {'name': st['name'], 'lines': sorted(st['lines']), 'places': len(places)}
        print(k, len(places), 'plekken', len(roads), 'straten', os.path.getsize(os.path.join(outdir, k + '.json')) // 1024, 'kB')
    with open(os.path.join(outdir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    cmd, repo, cache = sys.argv[1:4]
    (fetch if cmd == 'fetch' else build)(repo, cache)
