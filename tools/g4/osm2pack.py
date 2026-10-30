# Mijlpaal 0 / G4: OpenStreetMap-uitsnede → compact omgevingspakket per buitenstation.
#
# Gebruik (eenmalig, data staat daarna in de repo):
#   curl -A "BerlinLife-G4/1.0" -o osm/<slug>.osm "https://api.openstreetmap.org/api/0.6/map?bbox=<w,s,e,n>"
#   python3 -I tools/g4/osm2pack.py osm/ public/assets/surroundings/
#
# Assenstelsel = het Blender-stationssjabloon (zie BlenderStationsV1.install): x langs het spoor, +x richting het
# volgende station (hogere index, richting Ruhleben), z dwars (+z = rechts bij rijrichting +x), y omhoog, 0 = perronvloer.
# De echte lijn buigt; in het spel loopt het spoor recht. Gebouwen die de spoorstrook raken vallen daarom weg.
# Data: © OpenStreetMap-bijdragers (ODbL). Alleen geometrie, hoogtes en soort worden bewaard.
import sys, os, json, math, random, xml.etree.ElementTree as ET

STATIONS = {
  # slug: station-node-naam, vorig en volgend station (lat, lon), perronhoogte boven straat (m), radius (m)
  'gleisdreieck':       dict(name='Gleisdreieck', prev=(52.5035, 13.3748), next=(52.4976, 13.3627), elev=8.0),
  'buelowstrasse':      dict(name='Bülowstraße', prev=(52.4995, 13.3740), next=(52.4996, 13.3536), elev=7.0),
  'nollendorfplatz':    dict(name='Nollendorfplatz', prev=(52.4976, 13.3627), next=(52.5019, 13.3426), elev=7.0),
  'schoenhauser-allee': dict(name='Schönhauser Allee', prev=(52.5597, 13.4134), next=(52.5414, 13.4122), elev=7.0),
  'eberswalder-strasse':dict(name='Eberswalder Straße', prev=(52.5492, 13.4136), next=(52.5326, 13.4126), elev=7.0),
  'olympia-stadion':    dict(name='Olympia-Stadion', prev=(52.5163, 13.2596), next=(52.5255, 13.2418), elev=1.5),
  'ruhleben':           dict(name='Ruhleben', prev=(52.5170, 13.2502), next=None, elev=2.5),
}
# U1d: viaductstations van de U1 (eigen gebied in het spel, zie src/lines/LineWorld.js). Assenstelsel = het
# U1-station in LineWorld: +x richting Warschauer Straße, +z rechts. Het eigen spoor (alle bovengrondse
# metro behalve de U2) bouwt het spel zelf; de U2 bij Gleisdreieck blijft als ander viaduct (laag 1 onder de U1).
# Coördinaten = src/data/u1.js. Uitvoer: <dst>/u1/<id>.json. Bestandsnaam van de uitsnede: osm/<osm>.osm.
U1 = [('kurfuerstenstrasse', 52.5003037, 13.3609762), ('gleisdreieck', 52.4995715, 13.3735305, 15.6, 'u1-gleisdreieck'),
      ('moeckernbruecke', 52.4991271, 13.3826389, 7), ('hallesches-tor', 52.4978374, 13.3899703, 7),
      ('prinzenstrasse', 52.4984002, 13.4050918, 7), ('kottbusser-tor', 52.4990137, 13.4178906, 7),
      ('goerlitzer-bahnhof', 52.4992519, 13.4276166, 7), ('schlesisches-tor', 52.5008434, 13.4414409, 7),
      ('warschauer-strasse', 52.5051735, 13.4490382, 7)]
LINE_STATIONS = {}
for i in range(1, len(U1)):
    sid, la, lo, el = U1[i][:4]
    LINE_STATIONS[U1[i][4] if len(U1[i]) > 4 else sid] = dict(line='U1', id=sid, at=(la, lo), prev=U1[i - 1][1:3],
                                                               next=U1[i + 1][1:3] if i + 1 < len(U1) else None, elev=float(el))
RADIUS = 260.0          # m rond het station
CORRIDOR = 12.5         # |z| < dit = spoorstrook van het spel (zijwanden G3b op ±9,08)
LEVEL = 3.4             # verdiepingshoogte Berlijnse Altbau

def tagsof(e): return {t.get('k'): t.get('v') for t in e.iter('tag')}

class Frame:
    def __init__(s, lat0, lon0, bearing_vec):
        s.lat0, s.lon0 = lat0, lon0
        s.kx = math.cos(math.radians(lat0)) * 111320.0; s.ky = 110574.0
        te, tn = bearing_vec; n = math.hypot(te, tn); s.t = (te / n, tn / n); s.r = (s.t[1], -s.t[0])
    def en(s, lat, lon): return ((lon - s.lon0) * s.kx, (lat - s.lat0) * s.ky)
    def local(s, lat, lon):
        e, n = s.en(lat, lon)
        return (e * s.t[0] + n * s.t[1], e * s.r[0] + n * s.r[1])

def seg_project(p, a, b):
    ax, ay = a; bx, by = b; px, py = p; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1e-9
    u = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L)); q = (ax + u * dx, ay + u * dy)
    return q, math.hypot(px - q[0], py - q[1]), (dx, dy)

def area(poly):
    return 0.5 * sum(poly[i][0] * poly[i - 1][1] - poly[i - 1][0] * poly[i][1] for i in range(len(poly)))

def seg_hits_corridor(poly, xr):
    # Raakt de veelhoek de strook |z| < CORRIDOR binnen |x| < xr?
    for i in range(len(poly)):
        (x1, z1), (x2, z2) = poly[i - 1], poly[i]
        if abs(z1) < CORRIDOR and abs(x1) < xr: return True
        if (z1 < 0) != (z2 < 0):
            x = x1 + (x2 - x1) * (0 - z1) / (z2 - z1)
            if abs(x) < xr: return True
    # strook-midden binnen veelhoek?
    inside = False
    for i in range(len(poly)):
        (x1, z1), (x2, z2) = poly[i - 1], poly[i]
        if (z1 > 0) != (z2 > 0) and 0 < x1 + (x2 - x1) * (0 - z1) / (z2 - z1): inside = not inside
    return inside

def height_of(tg, a):
    def num(v):
        try: return float(str(v).replace('m', '').replace(',', '.').split(';')[0].strip())
        except Exception: return None
    h = num(tg.get('height')); lv = num(tg.get('building:levels')); rl = num(tg.get('roof:levels')) or 0
    mh = num(tg.get('min_height')) or ((num(tg.get('building:min_level')) or 0) * LEVEL)
    b = tg.get('building', 'yes')
    if h is None:
        if lv is None:
            lv = {'apartments': 5, 'residential': 5, 'house': 2, 'detached': 2, 'terrace': 3, 'commercial': 5, 'office': 6, 'retail': 2,
                  'warehouse': 2.3, 'industrial': 2.3, 'hut': 1, 'shed': 1, 'container': 0.8, 'garage': 1, 'garages': 1, 'kiosk': 1,
                  'service': 1, 'school': 4, 'church': 6, 'train_station': 3, 'transportation': 2, 'hotel': 7}.get(b, 5 if a > 300 else 2)
        h = (lv + rl * 0.6) * LEVEL
    return round(max(2.6, h), 1), round(max(0.0, mh), 1)

def kind_of(tg):
    b = tg.get('building', 'yes')
    if b in ('office', 'commercial', 'retail', 'industrial', 'warehouse', 'hotel', 'school', 'university', 'hospital', 'public', 'transportation', 'train_station'): return 1
    if b in ('hut', 'shed', 'container', 'garage', 'garages', 'kiosk', 'service', 'roof', 'carport'): return 2
    return 0  # Altbau / woongebouw

ROADW = {'motorway': 18, 'trunk': 16, 'primary': 14, 'secondary': 12, 'tertiary': 10, 'unclassified': 7, 'residential': 7, 'living_street': 6,
         'service': 4, 'pedestrian': 6, 'footway': 2.4, 'path': 2.2, 'cycleway': 2.4, 'track': 3, 'steps': 2}

def clip_square(pts, h):
    # Sutherland–Hodgman tegen het vierkant |x|,|z| <= h (water/groen kan kilometers doorlopen).
    for ax, sg in ((0, 1), (0, -1), (1, 1), (1, -1)):
        if not pts: break
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]; ina, inb = sg * a[ax] <= h, sg * b[ax] <= h
            if ina != inb:
                t = (sg * h - a[ax]) / ((b[ax] - a[ax]) or 1e-9); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            if inb: out.append(b)
        pts = out
    return pts

def is_own_line(tg):
    # U1-pakketten: alle bovengrondse metro behalve de U2 is "eigen spoor" (namen in OSM wisselen: U1, Hochbahn …).
    nm = (tg.get('name', '') + ' ' + tg.get('ref', '')).upper()
    return tg.get('railway') == 'subway' and tg.get('tunnel') not in ('yes',) and 'U2' not in nm

def run(src, dst):
    os.makedirs(dst, exist_ok=True)
    for slug, cfg in list(STATIONS.items()) + list(LINE_STATIONS.items()):
        fn = os.path.join(src, slug + '.osm')
        if not os.path.exists(fn): print('ontbreekt', fn); continue
        line = cfg.get('line')
        root = ET.parse(fn).getroot()
        nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node') if n.get('lat')}
        ways = {w.get('id'): ([x.get('ref') for x in w.iter('nd')], tagsof(w)) for w in root.iter('way')}
        st = cfg.get('at')
        for n in ([] if st else root.iter('node')):
            tg = tagsof(n)
            if tg.get('railway') == 'station' and tg.get('name') == cfg['name'] and tg.get('station') == 'subway': st = nodes[n.get('id')]
        if not st:
            for n in root.iter('node'):
                tg = tagsof(n)
                if tg.get('name') == cfg['name'] and (tg.get('railway') in ('station', 'stop') or tg.get('public_transport') == 'station'): st = nodes[n.get('id')]; break
        f0 = Frame(st[0], st[1], (1, 0)); p = f0.en(*st)
        # Dichtstbijzijnde U2-segment: oorsprong + richting.
        best = None
        dirv = (f0.en(*cfg['next'])[0] - f0.en(*cfg['prev'])[0], f0.en(*cfg['next'])[1] - f0.en(*cfg['prev'])[1]) if cfg['next'] else (p[0] - f0.en(*cfg['prev'])[0], p[1] - f0.en(*cfg['prev'])[1])
        own_layer = 1
        for wid, (nd, tg) in ways.items():
            if tg.get('railway') != 'subway': continue
            nm = (tg.get('name', '') + ' ' + tg.get('ref', '')).upper()
            if line:
                if not is_own_line(tg): continue
            elif any(k in nm for k in ('U1', 'U3', 'U5', 'U6', 'U7', 'U8', 'U9', 'U4')) and 'U2' not in nm: continue
            pts = [f0.en(*nodes[r]) for r in nd if r in nodes]
            for i in range(1, len(pts)):
                q, d, v = seg_project(p, pts[i - 1], pts[i])
                if line:   # alleen segmenten die ongeveer in de rijrichting lopen (geen keersporen dwars)
                    c = abs(v[0] * dirv[0] + v[1] * dirv[1]) / ((math.hypot(*v) * math.hypot(*dirv)) or 1)
                    if c < 0.8: continue
                if best is None or d < best[1]:
                    best = (q, d, v)
                    try: own_layer = int(tg.get('layer', '1'))
                    except Exception: own_layer = 1
        q, d, v = best
        if v[0] * dirv[0] + v[1] * dirv[1] < 0: v = (-v[0], -v[1])
        lat0 = st[0] + q[1] / f0.ky; lon0 = st[1] + q[0] / f0.kx
        F = Frame(lat0, lon0, v)
        L = lambda r: F.local(*nodes[r])
        rnd = lambda x: int(round(x * 10))
        out = dict(v=1, slug=cfg.get('id', slug), name=cfg.get('name', cfg.get('id')), attribution='© OpenStreetMap-bijdragers (ODbL)', origin=[round(lat0, 6), round(lon0, 6)],
                   bearing=round(math.degrees(math.atan2(v[0], v[1])) % 360, 1), elev=cfg['elev'], radius=RADIUS,
                   b=[], r=[], g=[], w=[], rail=[], via=[], trees=[], scale=10)
        if line: out['line'] = line; out['ownLayer'] = own_layer
        def poly_of(nd):
            pts = [L(r) for r in nd if r in nodes]
            if len(pts) > 3 and pts[0] == pts[-1]: pts = pts[:-1]
            return pts
        near = lambda pts: any(math.hypot(x, z) < RADIUS for x, z in pts)
        flat = lambda pts: [c for x, z in pts for c in (rnd(x), rnd(z))]
        # Multipolygonen (gebouwen, parken): alleen buitenringen die als losse way bestaan.
        mp_tags = {}
        for rel in root.iter('relation'):
            tg = tagsof(rel)
            if tg.get('type') != 'multipolygon': continue
            for m in rel.iter('member'):
                if m.get('type') == 'way' and m.get('role') == 'outer': mp_tags.setdefault(m.get('ref'), tg)
        dropped = 0
        for wid, (nd, tg0) in ways.items():
            tg = dict(mp_tags.get(wid, {})); tg.update(tg0)
            closed = len(nd) > 3 and nd[0] == nd[-1]
            if 'building' in tg and closed and tg.get('building') not in ('roof', 'construction') and tg.get('location') != 'underground':
                pts = poly_of(nd)
                if len(pts) < 3 or not near(pts): continue
                a = area(pts)
                if abs(a) < 6: continue
                if a < 0: pts = pts[::-1]      # tegen de klok in (van boven gezien in x,z → controle in de app)
                if seg_hits_corridor(pts, RADIUS): dropped += 1; continue
                h, mh = height_of(tg, abs(a))
                out['b'].append([h, mh, kind_of(tg)] + flat(pts))
            elif tg.get('highway') in ROADW and tg.get('area') != 'yes' and tg.get('tunnel') not in ('yes', 'building_passage'):
                pts = poly_of(nd) if not closed else [L(r) for r in nd if r in nodes]
                if len(pts) < 2 or not near(pts): continue
                w = ROADW[tg['highway']]
                try: w = max(w, float(tg.get('lanes', 0)) * 3.2)
                except Exception: pass
                out['r'].append([rnd(w)] + flat(pts))
            elif closed and (tg.get('leisure') in ('park', 'garden', 'playground', 'pitch') or tg.get('landuse') in ('grass', 'meadow', 'forest', 'recreation_ground', 'village_green', 'allotments', 'cemetery')
                             or tg.get('natural') in ('wood', 'scrub', 'grassland')):
                pts = poly_of(nd)
                if len(pts) < 3 or not near(pts): continue
                pts = clip_square(pts, RADIUS + 60)
                if len(pts) < 3: continue
                wooded = tg.get('landuse') == 'forest' or tg.get('natural') in ('wood', 'scrub')
                kind = 1 if wooded else (2 if tg.get('leisure') == 'pitch' else 0)
                if area(pts) < 0: pts = pts[::-1]
                out['g'].append([kind] + flat(pts))
            elif closed and (tg.get('natural') == 'water' or tg.get('waterway') == 'riverbank' or tg.get('landuse') == 'basin'):
                pts = poly_of(nd)
                if len(pts) < 3 or not near(pts): continue
                pts = clip_square(pts, RADIUS + 60)
                if len(pts) < 3: continue
                if area(pts) < 0: pts = pts[::-1]
                out['w'].append(flat(pts))
            elif tg.get('waterway') in ('canal', 'river'):
                pts = poly_of(nd)
                if len(pts) >= 2 and near(pts): out['r'].append([-rnd(22 if tg['waterway'] == 'canal' else 30)] + flat(pts))  # negatief = water
            elif tg.get('railway') in ('rail', 'light_rail', 'subway', 'tram', 'narrow_gauge', 'disused', 'abandoned') and tg.get('tunnel') != 'yes':
                pts = poly_of(nd)
                if len(pts) < 2 or not near(pts): continue
                nm = (tg.get('name', '') + ' ' + tg.get('ref', '')).upper()
                if line:
                    if is_own_line(tg): continue   # eigen lijn (U1): bouwt LineWorld zelf, recht
                elif tg['railway'] == 'subway' and ('U2' in nm or not nm.strip()):
                    continue   # eigen lijn: het spel heeft een recht spoor; die bouwt de app zelf
                try: layer = int(tg.get('layer', '0'))
                except Exception: layer = 0
                if tg['railway'] == 'subway' and (tg.get('bridge') in ('viaduct', 'yes') or layer >= 1):
                    out['via'].append([layer, rnd(8.5)] + flat(pts))
                elif tg['railway'] not in ('disused', 'abandoned'):
                    out['rail'].append([1 if tg['railway'] == 'tram' else 0] + flat(pts))
        for n in root.iter('node'):
            tg = tagsof(n)
            if tg.get('natural') == 'tree':
                x, z = L(n.get('id'))
                if math.hypot(x, z) < RADIUS and abs(z) > CORRIDOR: out['trees'].append([rnd(x), rnd(z)])
        js = json.dumps(out, separators=(',', ':'), ensure_ascii=False)
        od = os.path.join(dst, line.lower()) if line else dst
        os.makedirs(od, exist_ok=True)
        with open(os.path.join(od, out['slug'] + '.json'), 'w', encoding='utf-8') as fh: fh.write(js)
        print(f"{slug}: bearing {out['bearing']}°, afstand node→spoor {d:.1f} m, gebouwen {len(out['b'])} (strook {dropped} weg), wegen {len(out['r'])}, groen {len(out['g'])}, "
              f"water {len(out['w'])}, sporen {len(out['rail'])}, viaducten {len(out['via'])}, bomen {len(out['trees'])}, {len(js)//1024} kB")

if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2])
