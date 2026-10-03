import numpy as np


def train_val_split(n, val_frac=0.2, seed=0):
    rng = np.random.default_rng(seed)
    idx = np.arange(n)
    rng.shuffle(idx)
    k = int(n * (1 - val_frac))
    return idx[:k], idx[k:]
def argo_holdout(profile_ids, holdout_frac=0.25, seed=1):
    rng = np.random.default_rng(seed)
    ids = np.array(profile_ids)
    rng.shuffle(ids)
    k = int(len(ids) * (1 - holdout_frac))
    train_ids = set(ids[:k].tolist())
    hold_ids = set(ids[k:].tolist())
    return train_ids, hold_ids
def assert_holdout(train_ids, hold_ids):
    assert len(set(train_ids) & set(hold_ids)) == 0
    return True
