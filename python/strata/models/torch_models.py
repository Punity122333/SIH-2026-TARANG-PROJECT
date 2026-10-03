import torch
from torch import nn

HAS_TORCH = True
class MaskedAttention(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.q = nn.Linear(dim, dim)
        self.k = nn.Linear(dim, dim)
        self.v = nn.Linear(dim, dim)
    def forward(self, x, land):
        q = self.q(x)
        k = self.k(x)
        v = self.v(x)
        s = (q @ k.transpose(-2, -1)) / (x.shape[-1] ** 0.5)
        if land is not None:
            s = s.masked_fill(land.unsqueeze(1).expand_as(s), float("-inf"))
        w = torch.softmax(s, dim=-1)
        return w @ v, w
class SwinEncoder(nn.Module):
    def __init__(self, cin=7, dim=96):
        super().__init__()
        self.proj = nn.Conv2d(cin, dim, 3, padding=1)
        self.attn = MaskedAttention(dim)
        self.pool = nn.AdaptiveAvgPool2d((8, 8))
    def forward(self, x, land=None):
        f = self.proj(x)
        b, d, h, w = f.shape
        seq = f.view(b, d, h * w).transpose(1, 2)
        lm = None
        if land is not None:
            lm = torch.nn.functional.interpolate(land.float().unsqueeze(1), size=(h, w), mode="nearest").view(b, h * w).bool()
            lm = lm.unsqueeze(1).expand(b, h * w, h * w)
        y, wgt = self.attn(seq, lm[:, :1, :] if lm is not None else None)
        y = y.transpose(1, 2).view(b, d, h, w)
        return self.pool(y), wgt
class ConvLSTMCell(nn.Module):
    def __init__(self, cin, hidden):
        super().__init__()
        self.conv = nn.Conv2d(cin + hidden, 4 * hidden, 3, padding=1)
        self.hidden = hidden
    def forward(self, x, state):
        h, c = state
        g = self.conv(torch.cat([x, h], dim=1))
        i, f, o, u = torch.chunk(g, 4, dim=1)
        i = torch.sigmoid(i)
        f = torch.sigmoid(f)
        o = torch.sigmoid(o)
        u = torch.tanh(u)
        cn = f * c + i * u
        hn = o * torch.tanh(cn)
        return hn, cn
class MonotonicDecoder(nn.Module):
    def __init__(self, zin=1536, levels=15):
        super().__init__()
        self.fc = nn.Linear(zin, levels - 1)
        self.top = nn.Linear(zin, 1)
        self.levels = levels
    def forward(self, z):
        steps = torch.nn.functional.softplus(self.fc(z)) + 0.05
        top = 28 + 0.1 * torch.tanh(self.top(z)).squeeze(-1)
        ctrl = [top]
        for k in range(self.levels - 1):
            ctrl.append(ctrl[-1] - steps[:, k])
        return torch.stack(ctrl, dim=1)
class PlainMLP(nn.Module):
    def __init__(self, zin=1536, levels=15):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(zin, 256), nn.ReLU(), nn.Linear(256, levels))
    def forward(self, z):
        return self.net(z)
class StrataNet(nn.Module):
    def __init__(self, mode="swin-monotonic"):
        super().__init__()
        self.mode = mode
        self.enc = SwinEncoder()
        self.cell = ConvLSTMCell(96, 96)
        self.dec = MonotonicDecoder(zin=96 * 8 * 8) if "monotonic" in mode else PlainMLP(zin=96 * 8 * 8)
    def forward(self, x, land=None):
        b, t, _c, _h, _w = x.shape
        hn = x.new_zeros((b, 96, 8, 8))
        cn = x.new_zeros((b, 96, 8, 8))
        for ti in range(t):
            f, _wgt = self.enc(x[:, ti], land)
            hn, cn = self.cell(f, (hn, cn))
        z = hn.reshape(b, -1)
        return self.dec(z)
