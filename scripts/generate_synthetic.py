import numpy as np
import os
def main():
    from strata.data.synthetic import synthetic_tensor
    t = synthetic_tensor()
    os.makedirs("artifacts", exist_ok=True)
    np.save(os.path.join("artifacts", "demo_tensor.npy"), t)
    print("saved artifacts/demo_tensor.npy " + str(t.shape))
if __name__ == "__main__":
    main()
