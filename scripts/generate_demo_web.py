import json
import os

import numpy as np
from strata.data.synthetic import DEPTHS, synthetic_tensor


def down(arr, step):
    return np.round(arr[::step, ::step], 3).tolist()


def main():
    t = synthetic_tensor()
    sst = t[0, 0]
    sss = t[0, 1]
    ssh = t[0, 2]
    payload = {
        "label": "DEMO / SIMULATED",
        "description": "Synthetic North Indian Ocean demo tensor sample for offline cache inspection. Not a trained model result.",
        "region": "bob",
        "date": "2024-07-15",
        "depths_m": DEPTHS.tolist(),
        "grid": {"h": 120, "w": 240, "sample_step": 4},
        "sst": down(sst, 4),
        "sss": down(sss, 4),
        "ssh": down(ssh, 4)
    }
    out = os.path.join(os.path.dirname(__file__), "..", "web", "public", "data", "demo-field.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print("saved " + os.path.relpath(out) + " bytes=" + str(os.path.getsize(out)))


if __name__ == "__main__":
    main()
