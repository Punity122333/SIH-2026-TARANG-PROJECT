import gzip
import json
import math
import sys
import mapbox_vector_tile
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer
LON0 = 40.0
LAT0 = -15.0
LON1 = 115.0
LAT1 = 35.0
EXTENT = 4096
MAXZ = 5
def clip_param(p, q, t0, t1):
    if p == 0:
        return (t0, t1, q < 0)
    r = q / p
    if p < 0:
        if r > t1:
            return (t0, t1, True)
        if r > t0:
            t0 = r
    else:
        if r < t0:
            return (t0, t1, True)
        if r < t1:
            t1 = r
    return (t0, t1, False)
def clip_seg(ax, ay, bx, by):
    dx = bx - ax
    dy = by - ay
    t0 = 0.0
    t1 = 1.0
    t0, t1, out = clip_param(-dx, ax - LON0, t0, t1)
    if out:
        return None
    t0, t1, out = clip_param(dx, LON1 - ax, t0, t1)
    if out:
        return None
    t0, t1, out = clip_param(-dy, ay - LAT0, t0, t1)
    if out:
        return None
    t0, t1, out = clip_param(dy, LAT1 - ay, t0, t1)
    if out or t1 < t0:
        return None
    return ((ax + dx * t0, ay + dy * t0), (ax + dx * t1, ay + dy * t1))
def clip_line(line):
    runs = []
    cur = []
    for i in range(len(line) - 1):
        seg = clip_seg(line[i][0], line[i][1], line[i + 1][0], line[i + 1][1])
        if seg is None:
            if len(cur) > 1:
                runs.append(cur)
            cur = []
            continue
        if not cur:
            cur = [seg[0]]
        cur.append(seg[1])
    if len(cur) > 1:
        runs.append(cur)
    return runs
def perp_dist(p, a, b):
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    d = math.hypot(dx, dy)
    if d == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    return abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / d
def simplify(line, eps):
    if len(line) < 3:
        return line
    keep = [False] * len(line)
    keep[0] = True
    keep[len(line) - 1] = True
    stack = [(0, len(line) - 1)]
    while stack:
        s, e = stack.pop()
        dmax = 0.0
        idx = s
        for i in range(s + 1, e):
            d = perp_dist(line[i], line[s], line[e])
            if d > dmax:
                dmax = d
                idx = i
        if dmax > eps:
            keep[idx] = True
            stack.append((s, idx))
            stack.append((idx, e))
    return [p for p, k in zip(line, keep) if k]
def tile_xy(lon, lat, z, x, y):
    n = float(1 << z)
    fx = (lon + 180.0) / 360.0 * n - x
    latr = math.radians(max(-85.05, min(85.05, lat)))
    fy = (1.0 - math.log(math.tan(latr) + 1.0 / math.cos(latr)) / math.pi) / 2.0 * n - y
    return (fx * EXTENT, fy * EXTENT)
def tile_range(z):
    def xt(lon):
        return int((lon + 180.0) / 360.0 * (1 << z))
    def yt(lat):
        latr = math.radians(max(-85.05, min(85.05, lat)))
        return int((1.0 - math.log(math.tan(latr) + 1.0 / math.cos(latr)) / math.pi) / 2.0 * (1 << z))
    return (xt(LON0), xt(LON1), yt(LAT1), yt(LAT0))
def build(src):
    gj = json.load(open(src, encoding="utf-8"))
    lines = []
    for f in gj["features"]:
        g = f["geometry"]
        if g["type"] == "LineString":
            rings = [g["coordinates"]]
        elif g["type"] == "MultiLineString":
            rings = g["coordinates"]
        else:
            continue
        for ring in rings:
            for run in clip_line(ring):
                s = simplify(run, 0.12)
                if len(s) > 1:
                    lines.append(s)
    return lines
def main():
    src = sys.argv[1]
    dst = sys.argv[2]
    lines = build(src)
    tiles = {}
    for z in range(0, MAXZ + 1):
        x0, x1, y0, y1 = tile_range(z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                feats = []
                for line in lines:
                    pts = []
                    for lon, lat in line:
                        px, py = tile_xy(lon, lat, z, x, y)
                        if -8 <= px <= EXTENT + 8 and -8 <= py <= EXTENT + 8:
                            pts.append([px, py])
                    if len(pts) > 1:
                        feats.append({"geometry": {"type": "LineString", "coordinates": pts}, "properties": {}})
                if feats:
                    raw = mapbox_vector_tile.encode([{"name": "coastline", "features": feats}], default_options={"y_coord_down": True, "quantize_bounds": (0, 0, EXTENT, EXTENT)})
                    tiles[(z, x, y)] = gzip.compress(raw, compresslevel=9)
    meta = {"name": "strata-coast", "attribution": "Natural Earth", "bounds": [LON0, LAT0, LON1, LAT1], "minzoom": 0, "maxzoom": MAXZ}
    header = {"version": 3, "root_offset": 0, "root_length": 0, "metadata_offset": 0, "metadata_length": 0, "leaf_directory_offset": 0, "leaf_directory_length": 0, "tile_data_offset": 0, "tile_data_length": 0, "addressed_tiles_count": 0, "tile_entries_count": 0, "tile_contents_count": 0, "clustered": True, "internal_compression": Compression.GZIP, "tile_compression": Compression.GZIP, "tile_type": TileType.MVT, "min_zoom": 0, "max_zoom": MAXZ, "min_lon_e7": int(LON0 * 1e7), "min_lat_e7": int(LAT0 * 1e7), "max_lon_e7": int(LON1 * 1e7), "max_lat_e7": int(LAT1 * 1e7), "center_zoom": 2, "center_lon_e7": int(77.5 * 1e7), "center_lat_e7": int(10.0 * 1e7)}
    out = open(dst, "wb")
    w = Writer(out)
    for key in sorted(tiles, key=lambda k: zxy_to_tileid(k[0], k[1], k[2])):
        w.write_tile(zxy_to_tileid(key[0], key[1], key[2]), tiles[key])
    w.finalize(header, meta)
    out.close()
    print("tiles=" + str(len(tiles)) + " bytes=" + str(sum(len(v) for v in tiles.values())))
if __name__ == "__main__":
    main()
