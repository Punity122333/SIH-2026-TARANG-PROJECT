import numpy as np
import torch

from strata.models.torch_models import (
    ConvLSTMCell,
    MaskedAttention,
    MonotonicDecoder,
    PlainMLP,
    StrataNet,
    SwinEncoder,
)


def test_torch_encoder_decoder_shapes():
    enc = SwinEncoder()
    x = torch.randn(1, 7, 16, 16)
    feat, wgt = enc(x, None)
    assert feat.shape == (1, 96, 8, 8)
    assert wgt.shape[1] == 256
    attn = MaskedAttention(8)
    xs = torch.randn(1, 16, 8)
    lm = torch.zeros(1, 16, dtype=torch.bool)
    lm[0, 3] = True
    out, w = attn(xs, lm)
    assert out.shape == (1, 16, 8)
    assert float(w.detach()[0, 0, 3]) < 1e-6
    cell = ConvLSTMCell(96, 32)
    h = torch.zeros(1, 32, 8, 8)
    c = torch.zeros(1, 32, 8, 8)
    f = torch.randn(1, 96, 8, 8)
    hn, cn = cell(f, (h, c))
    assert hn.shape == (1, 32, 8, 8)
    assert cn.shape == (1, 32, 8, 8)
    dec = MonotonicDecoder(zin=128)
    z = torch.randn(2, 128)
    ctrl = dec(z)
    assert ctrl.shape == (2, 15)
    d = (ctrl[:, 1:] - ctrl[:, :-1]).detach().numpy()
    assert bool((d < 0).all())
    mlp = PlainMLP(zin=128)
    m = mlp(z)
    assert m.shape == (2, 15)
    net = StrataNet(mode="swin-monotonic-oi")
    xb = torch.randn(1, 2, 7, 16, 16)
    p = net(xb, None)
    assert p.shape == (1, 15)
    net2 = StrataNet(mode="swin-mlp-oi")
    p2 = net2(xb, None)
    assert p2.shape == (1, 15)


def test_torch_decoder_top_varies():
    dec = MonotonicDecoder(zin=16)
    z0 = torch.zeros(1, 16)
    z1 = torch.ones(1, 16)
    c0 = dec(z0).detach().numpy()
    c1 = dec(z1).detach().numpy()
    assert c0.shape == (1, 15)
    assert not np.allclose(c0, c1)
