import os
import json
import torch
import torch.nn as nn
import numpy as np

class DiagnosticsCollector:
    def __init__(self, model: nn.Module, run_id: str):
        self.model = model
        self.run_id = run_id
        self.activations = {}
        self.hooks = []
        self.filepath = os.path.join("../data/runs", f"{run_id}.diagnostics.json")

    def register_hooks(self):
        self.remove_hooks()
        
        for name, module in self.model.named_modules():
            if name == "":
                continue
            
            def get_hook(module_name):
                def hook(mod, inp, out):
                    if isinstance(out, torch.Tensor):
                        self.activations[module_name] = out.detach().cpu()
                    elif isinstance(out, tuple) and len(out) > 0 and isinstance(out[0], torch.Tensor):
                        self.activations[module_name] = out[0].detach().cpu()
                return hook
                
            h = module.register_forward_hook(get_hook(name))
            self.hooks.append(h)

    def remove_hooks(self):
        for h in self.hooks:
            h.remove()
        self.hooks = []

    def collect_epoch(self, epoch: int, lr: float):
        """Collects weights, gradients, activations, update ratios, and attention weights."""
        epoch_data = {
            "epoch": epoch,
            "activations": {},
            "gradients": {},
            "weights": {},
            "update_ratio": {},
            "attention": {}
        }

        # 1. Weights, Gradients, and Update Ratio
        for name, param in self.model.named_parameters():
            if param.numel() == 0:
                continue
            
            # Weights
            w_val = param.detach().cpu().numpy()
            w_mean = float(np.mean(w_val))
            w_std = float(np.std(w_val))
            hist, bin_edges = np.histogram(w_val, bins=10)
            epoch_data["weights"][name] = {
                "mean": w_mean,
                "std": w_std,
                "hist_bins": bin_edges.tolist(),
                "hist_counts": hist.tolist()
            }
            
            # Gradients and Update Ratio
            if param.grad is not None:
                g_val = param.grad.detach().cpu().numpy()
                g_mean = float(np.mean(g_val))
                g_std = float(np.std(g_val))
                g_hist, g_bin_edges = np.histogram(g_val, bins=10)
                epoch_data["gradients"][name] = {
                    "mean": g_mean,
                    "std": g_std,
                    "hist_bins": g_bin_edges.tolist(),
                    "hist_counts": g_hist.tolist()
                }
                
                # Update ratio: std(lr * grad) / std(param)
                param_std = float(np.std(w_val))
                grad_std = float(np.std(g_val))
                if param_std > 0:
                    epoch_data["update_ratio"][name] = float((lr * grad_std) / (param_std + 1e-8))
                else:
                    epoch_data["update_ratio"][name] = 0.0

        # 2. Activations
        for name, act_tensor in self.activations.items():
            if act_tensor.numel() == 0:
                continue
            act_val = act_tensor.numpy()
            act_mean = float(np.mean(act_val))
            act_std = float(np.std(act_val))
            hist, bin_edges = np.histogram(act_val, bins=10)
            
            # % Saturated: |x| > 0.97
            saturated = float(np.mean(np.abs(act_val) > 0.97))
            
            epoch_data["activations"][name] = {
                "mean": act_mean,
                "std": act_std,
                "hist_bins": bin_edges.tolist(),
                "hist_counts": hist.tolist(),
                "percent_saturated": saturated
            }

        # 3. Attention heatmaps
        for name, module in self.model.named_modules():
            if hasattr(module, "attn_weights") and module.attn_weights is not None:
                attn_w = module.attn_weights
                if attn_w.dim() >= 3:
                    attn_w_mean = attn_w[0].numpy()
                else:
                    attn_w_mean = attn_w.numpy()
                
                epoch_data["attention"][name] = attn_w_mean.tolist()

        # Save to file
        self.save_record(epoch_data)

    def save_record(self, epoch_data):
        records = []
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, encoding="utf-8") as f:
                    records = json.load(f)
            except Exception:
                pass
        
        records = [r for r in records if r["epoch"] != epoch_data["epoch"]]
        records.append(epoch_data)
        
        os.makedirs(os.path.dirname(self.filepath) or ".", exist_ok=True)
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(records, f)
