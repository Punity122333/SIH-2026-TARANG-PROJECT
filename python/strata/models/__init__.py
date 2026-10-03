from typing import Any

from strata.models.numpy_models import (
    masked_attention_weights,
    mlp_forward,
    monotonic_control_points,
    spline_eval,
)

MaskedAttention: Any = None
MonotonicDecoder: Any = None
PlainMLP: Any = None
StrataNet: Any = None
SwinEncoder: Any = None
HAS_TORCH: bool = False
try:
    from strata.models.torch_models import HAS_TORCH as _HAS_TORCH
    from strata.models.torch_models import MaskedAttention as _MaskedAttention
    from strata.models.torch_models import MonotonicDecoder as _MonotonicDecoder
    from strata.models.torch_models import PlainMLP as _PlainMLP
    from strata.models.torch_models import StrataNet as _StrataNet
    from strata.models.torch_models import SwinEncoder as _SwinEncoder
    HAS_TORCH = _HAS_TORCH
    MaskedAttention = _MaskedAttention
    MonotonicDecoder = _MonotonicDecoder
    PlainMLP = _PlainMLP
    StrataNet = _StrataNet
    SwinEncoder = _SwinEncoder
except ImportError:
    HAS_TORCH = False
__all__ = ["HAS_TORCH", "MaskedAttention", "MonotonicDecoder", "PlainMLP", "StrataNet", "SwinEncoder", "masked_attention_weights", "mlp_forward", "monotonic_control_points", "spline_eval"]
