import { DEPTH_LEVELS, GRID_H, GRID_W, REGIONS } from "@/lib/config";
import type { EngineInput, RunResult, ArgoFloat, Metrics } from "@/engine/types";
import { hashSeed, mulberry32, dayOfYear, makeNoise, makeEddies, eddyField } from "@/engine/demo/prng";
export function regionBounds(region: string) {
  const f = REGIONS.find((r) => r.id === region);
  if (f) return f;
  return REGIONS[0];
}
function landMaskFor(h: number, w: number, regionId: string): Uint8Array {
  const out = new Uint8Array(h * w);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const fn = (r / h + c / w * 0.35) % 1;
      let land = false;
      if (regionId === "bob") {
        if (r < h * 0.1 + Math.sin(c / w * 6.2) * h * 0.03) land = true;
        if (c > w * 0.93) land = true;
        if (c < w * 0.04 && r < h * 0.4) land = true;
      } else if (regionId === "arabian") {
        if (r < h * 0.1 + Math.cos(c / w * 5.1) * h * 0.03) land = true;
        if (c < w * 0.06) land = true;
        if (c > w * 0.9 && r < h * 0.45) land = true;
      } else {
        if (r < h * 0.08) land = true;
        if (fn < 0.02) land = true;
      }
      out[r * w + c] = land ? 1 : 0;
    }
  }
  return out;
}
export function runDemoSync(input: EngineInput): RunResult {
  const t0 = performance.now();
  const h = GRID_H;
  const w = GRID_W;
  const depths = [...DEPTH_LEVELS];
  const bounds = regionBounds(input.region);
  const key = [input.region, input.date, JSON.stringify(input.layers), input.engineMode, input.gapMethod, String(input.physics.lambda1), String(input.physics.lambda2)].join("|");
  const rand = mulberry32(hashSeed(key));
  const doy = dayOfYear(input.date);
  const seasonal = Math.sin((doy / 365) * Math.PI * 2);
  const month = Number(input.date.slice(5, 7));
  const swMonsoon = month >= 6 && month <= 9 ? 1 : -1;
  const noiseA = makeNoise(h, w, rand, 3);
  const noiseB = makeNoise(h, w, rand, 3);
  const noiseC = makeNoise(h, w, rand, 2);
  const eddies = makeEddies(rand, h, w, 9);
  const eddy = eddyField(h, w, eddies);
  const land = landMaskFor(h, w, input.region);
  const sst = new Float32Array(h * w);
  const sss = new Float32Array(h * w);
  const ssh = new Float32Array(h * w);
  const curU = new Float32Array(h * w);
  const curV = new Float32Array(h * w);
  const windU = new Float32Array(h * w);
  const windV = new Float32Array(h * w);
  const gap = new Uint8Array(h * w);
  const gapNoise = makeNoise(h, w, rand, 2);
  const gapThresh = 0.18 + (hashSeed(input.date) % 20) / 100;
  for (let r = 0; r < h; r++) {
    const latFrac = 1 - r / h;
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (land[i] === 1) {
        sst[i] = NaN;
        sss[i] = NaN;
        ssh[i] = NaN;
        curU[i] = 0;
        curV[i] = 0;
        windU[i] = 0;
        windV[i] = 0;
        gap[i] = 1;
        continue;
      }
      const latGrad = 27 + latFrac * 3.2 + seasonal * 1.1;
      const sstV = latGrad + eddy[i] * 1.4 + noiseA[i] * 0.7;
      sst[i] = sstV;
      const fresh = input.region === "bob" ? Math.max(0, 1 - Math.hypot(r - h * 0.12, c - w * 0.55) / (h * 0.5)) : 0;
      const salty = input.region === "arabian" ? 0.7 : 0.15;
      sss[i] = 34.6 + salty * 0.9 - fresh * 2.6 + noiseB[i] * 0.35 + eddy[i] * 0.12;
      ssh[i] = eddy[i] * 0.22 + noiseC[i] * 0.05;
      windU[i] = swMonsoon * (4.5 + noiseA[i] * 1.6) + noiseC[i];
      windV[i] = swMonsoon * 1.8 + noiseB[i] * 1.2;
      gap[i] = gapNoise[i] + eddy[i] * 0.15 > gapThresh ? 1 : 0;
    }
  }
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      const i = r * w + c;
      if (land[i] === 1) continue;
      const dSdx = (ssh[r * w + c + 1] - ssh[r * w + c - 1]) / 2;
      const dSdy = (ssh[(r + 1) * w + c] - ssh[(r - 1) * w + c]) / 2;
      curU[i] = -dSdy * 3.2 + windU[i] * 0.02;
      curV[i] = dSdx * 3.2 + windV[i] * 0.02;
    }
  }
  const nd = depths.length;
  const truthVolume = new Float32Array(nd * h * w);
  const salVolume = new Float32Array(nd * h * w);
  const thermoDepthField = new Float32Array(h * w);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (land[i] === 1) {
        for (let k = 0; k < nd; k++) {
          truthVolume[k * h * w + i] = NaN;
          salVolume[k * h * w + i] = NaN;
        }
        thermoDepthField[i] = NaN;
        continue;
      }
      const sstV = sst[i];
      const sshV = ssh[i];
      const td = 120 + sshV * 160 + noiseB[i] * 12;
      const tdc = Math.min(260, Math.max(60, td));
      thermoDepthField[i] = tdc;
      const deepT = 4.2 + noiseC[i] * 0.4;
      for (let k = 0; k < nd; k++) {
        const z = depths[k];
        const sig = 1 / (1 + Math.exp(-(z - tdc) / 55));
        const t = deepT + (sstV - deepT) * (1 - sig * 0.96);
        truthVolume[k * h * w + i] = t;
        const sSurf = sss[i];
        const sDeep = 35.05 + noiseA[i] * 0.05;
        salVolume[k * h * w + i] = sDeep + (sSurf - sDeep) * Math.exp(-z / 160);
      }
    }
  }
  const modeScale =
    input.engineMode === "swin-monotonic-oi"
      ? 1
      : input.engineMode === "resnet-monotonic-oi"
        ? 1.45
        : input.engineMode === "swin-mlp-oi"
          ? 1.9
          : input.engineMode === "swin-monotonic-bilinear"
            ? 1.7
            : 2.6;
  const gapPenalty = input.gapMethod === "bilinear" || input.engineMode === "swin-monotonic-bilinear" ? 1.5 : 1;
  const layerPenalty =
    (input.layers.ssh ? 0 : 0.9) + (input.layers.sst ? 0 : 0.7) + (input.layers.sss ? 0 : 0.25) + (input.layers.currents ? 0 : 0.2) + (input.layers.winds ? 0 : 0.2);
  const errScale = (0.22 + layerPenalty * 0.5) * modeScale * gapPenalty;
  const errNoise = makeNoise(h, w, rand, 3);
  const reconVolume = new Float32Array(nd * h * w);
  for (let k = 0; k < nd; k++) {
    const z = depths[k];
    const depthFactor = z < 50 ? 0.7 : z <= 300 ? 1.6 : 0.9;
    for (let i = 0; i < h * w; i++) {
      const t = truthVolume[k * h * w + i];
      if (!Number.isFinite(t)) {
        reconVolume[k * h * w + i] = NaN;
        continue;
      }
      const isGap = gap[i] === 1;
      const g = isGap ? 1.6 : 1;
      let e = errNoise[i] * errScale * depthFactor * g + (rand() - 0.5) * 0.08;
      if (!input.layers.ssh && z >= 50 && z <= 300) e += Math.sign(errNoise[i]) * 0.55;
      if (!input.layers.sst && z < 50) e += -0.8 * Math.sign(sst[i] - 28);
      let v = t + e;
      if (input.engineMode === "swin-mlp-oi" && k > 0) {
        const inv = Math.sin(i * 0.11 + k * 1.7) > 0.86 ? 0.5 + rand() * 0.5 : 0;
        v += inv;
      }
      if (input.physics.lambda1 > 1.2 && k > 0) v = v * 0.995 + t * 0.005;
      reconVolume[k * h * w + i] = v;
    }
  }
  if (input.physics.monotonic) {
    for (let i = 0; i < h * w; i++) {
      if (!Number.isFinite(reconVolume[i])) continue;
      for (let k = 1; k < nd; k++) {
        const prev = reconVolume[(k - 1) * h * w + i];
        const cur = reconVolume[k * h * w + i];
        if (cur > prev) reconVolume[k * h * w + i] = prev - 0.01;
      }
    }
  } else {
    const invRand = mulberry32(hashSeed(key + "|inv"));
    for (let i = 0; i < h * w; i++) {
      if (!Number.isFinite(reconVolume[i])) continue;
      const v = invRand();
      const bump = 0.9 + v * 0.5;
      reconVolume[11 * h * w + i] = reconVolume[11 * h * w + i] + bump;
      reconVolume[12 * h * w + i] = reconVolume[12 * h * w + i] + bump;
      reconVolume[5 * h * w + i] = reconVolume[5 * h * w + i] + 2.8;
    }
  }
  const argo: ArgoFloat[] = [];
  const nFloats = 8;
  for (let f = 0; f < nFloats; f++) {
    const rr = Math.floor((rand() * 0.7 + 0.15) * h);
    const cc = Math.floor((rand() * 0.7 + 0.15) * w);
    const step = 9;
    const rCell = Math.floor(rr / step) * step + 4;
    const cCell = Math.floor(cc / step) * step + 4;
    const r2 = Math.min(h - 2, Math.max(1, rCell));
    const c2 = Math.min(w - 2, Math.max(1, cCell));
    const idx = r2 * w + c2;
    if (land[idx] === 1) continue;
    const lon = bounds.lonMin + ((c2 + 0.5) / w) * (bounds.lonMax - bounds.lonMin);
    const lat = bounds.latMax - ((r2 + 0.5) / h) * (bounds.latMax - bounds.latMin);
    const truth: number[] = [];
    const observed: number[] = [];
    const salinity: number[] = [];
    for (let k = 0; k < nd; k++) {
      const tv = truthVolume[k * h * w + idx];
      truth.push(tv);
      observed.push(tv + (rand() - 0.5) * 0.12);
      salinity.push(salVolume[k * h * w + idx]);
    }
    argo.push({ id: "F" + String(f + 1).padStart(2, "0"), lat, lon, row: r2, col: c2, truth, observed, salinity });
  }
  let se = 0;
  let n = 0;
  let sumT = 0;
  let thermoErrSum = 0;
  let biasSum = 0;
  for (const fl of argo) {
    const idx = fl.row * w + fl.col;
    const reconP: number[] = [];
    for (let k = 0; k < nd; k++) reconP.push(reconVolume[k * h * w + idx]);
    for (let k = 0; k < nd; k++) {
      const e = reconP[k] - fl.truth[k];
      se += e * e;
      biasSum += e;
      n++;
      sumT += fl.truth[k];
    }
    thermoErrSum += Math.abs(thermoDepthOf(reconP, depths) - thermoDepthOf(fl.truth, depths));
  }
  const mse = n > 0 ? se / n : 0;
  const rmse = Math.sqrt(mse);
  const bias = n > 0 ? biasSum / n : 0;
  const meanT = n > 0 ? sumT / n : 0;
  let ssTot = 0;
  let ssRes = 0;
  for (const fl of argo) {
    const idx = fl.row * w + fl.col;
    for (let k = 0; k < nd; k++) {
      const tv = fl.truth[k];
      const rv = reconVolume[k * h * w + idx];
      ssTot += (tv - meanT) * (tv - meanT);
      ssRes += (tv - rv) * (tv - rv);
    }
  }
  const r2 = ssTot > 1e-9 ? 1 - ssRes / ssTot : 0;
  const thermoErr = argo.length > 0 ? thermoErrSum / argo.length : 0;
  let lStabSum = 0;
  let lStabN = 0;
  for (const fl of argo) {
    const idx = fl.row * w + fl.col;
    for (let k = 1; k < nd; k++) {
      const dT = reconVolume[k * h * w + idx] - reconVolume[(k - 1) * h * w + idx];
      const dz = depths[k] - depths[k - 1];
      const grad = dT / dz;
      if (grad > 0) lStabSum += grad * grad;
      lStabN++;
    }
  }
  const lStab = lStabN > 0 ? lStabSum / lStabN : 0;
  const lThermal = Math.abs(noiseC[100] * 0.02 + (input.layers.ssh ? 0.004 : 0.02) + input.physics.lambda2 * 0.001);
  const lam1 = input.physics.stabOn ? input.physics.lambda1 : 0;
  const lam2 = input.physics.thermalOn ? input.physics.lambda2 : 0;
  const total = mse + lam1 * lStab + lam2 * lThermal;
  let miss = 0;
  for (let i = 0; i < h * w; i++) if (land[i] === 0 && gap[i] === 1) miss++;
  let ocean = 0;
  for (let i = 0; i < h * w; i++) if (land[i] === 0) ocean++;
  const missingPct = ocean > 0 ? (miss / ocean) * 100 : 0;
  const midR = Math.floor(h / 2);
  const midC = Math.floor(w / 2);
  const midI = midR * w + midC;
  const surfaceTemp = Number.isFinite(reconVolume[midI]) ? reconVolume[midI] : 28;
  const midRecon: number[] = [];
  for (let k = 0; k < nd; k++) midRecon.push(reconVolume[k * h * w + midI]);
  const thermoDepth = thermoDepthOf(midRecon, depths);
  let heat = 0;
  for (let k = 0; k < nd; k++) {
    if (depths[k] > 300) break;
    const dz = k === 0 ? depths[1] - depths[0] : depths[k] - depths[k - 1];
    const tv = midRecon[k];
    if (Number.isFinite(tv)) heat += 1025 * 4000 * Math.max(0, tv) * dz;
  }
  const uohc = heat / 1e8;
  const metrics: Metrics = { rmse, bias, r2, thermoErr, uohc, mse, lStab, lThermal, total, missingPct, surfaceTemp, thermoDepth };
  const ingest = [
    { id: "OSTIA", missingPct },
    { id: "SMAP / SMOS", missingPct: Math.min(100, missingPct * 1.4) },
    { id: "DUACS", missingPct: Math.min(100, missingPct * 0.15) },
    { id: "OSCAR", missingPct: Math.min(100, missingPct * 0.6) },
    { id: "CCMP", missingPct: Math.min(100, missingPct * 0.5) }
  ];
  const t1 = performance.now();
  return {
    input,
    depths,
    surface: { sst, sss, ssh, curU, curV, windU, windV, land, gap },
    truthVolume,
    reconVolume,
    salVolume,
    h,
    w,
    argo,
    metrics,
    ingest,
    timingMs: t1 - t0,
    tes: null,
    provenance: "demo / synthetic data / untrained weights",
    synthetic: true,
    untrained: true,
    engineId: "demo",
    version: "0.1.0"
  };
}
export function thermoDepthOf(profile: number[], depths: number[]): number {
  let best = depths[4] || 75;
  let bestGrad = Infinity;
  for (let k = 1; k < profile.length; k++) {
    const dz = depths[k] - depths[k - 1];
    const g = (profile[k] - profile[k - 1]) / dz;
    if (g < bestGrad) {
      bestGrad = g;
      best = (depths[k] + depths[k - 1]) / 2;
    }
  }
  return best;
}
export function profileAt(result: RunResult, row: number, col: number) {
  const { h, w, depths } = result;
  const idx = row * w + col;
  const recon: number[] = [];
  const truth: number[] = [];
  const sal: number[] = [];
  for (let k = 0; k < depths.length; k++) {
    recon.push(result.reconVolume[k * h * w + idx]);
    truth.push(result.truthVolume[k * h * w + idx]);
    sal.push(result.salVolume[k * h * w + idx]);
  }
  return { recon, truth, sal };
}
