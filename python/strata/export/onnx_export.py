def export_onnx(path="strata.onnx", example_size=32):
    import torch

    from strata.models.torch_models import HAS_TORCH, StrataNet

    if not HAS_TORCH:
        raise RuntimeError("torch is required for ONNX export")
    model = StrataNet()
    model.eval()
    x = torch.zeros(1, 7, 7, example_size, example_size)
    torch.onnx.export(
        model,
        (x,),
        path,
        input_names=["input"],
        output_names=["profile"],
        opset_version=18,
        dynamo=False,
    )
    return path
