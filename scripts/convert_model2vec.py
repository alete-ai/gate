import os
import torch
import torch.nn as nn
import coremltools as ct
import coremltools.optimize as cto

# 1. Define the custom PyTorch Model2Vec Core ML Module
class Model2VecCoreML(nn.Module):
    def __init__(self, combined_embeddings, head0_weight, head0_bias, head2_weight, head2_bias):
        super().__init__()
        vocab_size, embedding_dim = combined_embeddings.shape
        hidden_dim = head0_weight.shape[0]
        num_classes = head2_weight.shape[0]
        
        # Static Embedding Matrix (combines original embeddings, token mapping, and sigmoid token weights)
        self.embeddings = nn.Embedding(vocab_size, embedding_dim)
        self.embeddings.weight.data = combined_embeddings.float()
        
        # Classifier Head
        self.head0 = nn.Linear(embedding_dim, hidden_dim)
        self.head0.weight.data = head0_weight.float()
        self.head0.bias.data = head0_bias.float()
        
        self.relu = nn.ReLU()
        
        self.head2 = nn.Linear(hidden_dim, num_classes)
        self.head2.weight.data = head2_weight.float()
        self.head2.bias.data = head2_bias.float()
        
    def forward(self, input_ids):
        # input_ids: (batch=1, seq_len)
        pad_id = 0
        zeros = (input_ids != pad_id).float()
        length = zeros.sum(dim=1, keepdim=True) + 1e-16
        
        # Embedding Lookup
        embedded = self.embeddings(input_ids) # (batch, seq_len, dim)
        
        # Mask Padding
        embedded = embedded * zeros.unsqueeze(-1)
        
        # Sum Pooling
        summed = embedded.sum(dim=1) # (batch, dim)
        
        # Mean Pooling
        pooled = summed / length
        
        # L2 Normalize sentence embeddings (matching SentenceTransformer/Model2Vec default)
        normalized = nn.functional.normalize(pooled, p=2.0, dim=1)
        
        # MLP Head
        x = self.head0(normalized)
        x = self.relu(x)
        logits = self.head2(x)
        return logits

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(project_root, "models")
    state_dict_path = os.path.join(model_dir, "Model2VecClassifierSubstrate.pt")
    
    fp16_mlpackage_path = os.path.join(model_dir, "Model2VecGatekeeper_fp16.mlpackage")
    int4_mlpackage_path = os.path.join(model_dir, "Model2VecGatekeeper.mlpackage")
    
    print("🚀 Model2Vec Conversion: Loading PyTorch training weights...")
    sd = torch.load(state_dict_path, map_location="cpu")
    
    embeddings = sd["embeddings.weight"] # [29528, 256]
    token_mapping = sd["token_mapping"] # [29528]
    w = sd["w"] # [29528]
    
    head0_w = sd["head.0.weight"] # [512, 256]
    head0_b = sd["head.0.bias"] # [512]
    head2_w = sd["head.2.weight"] # [4, 512]
    head2_b = sd["head.2.bias"] # [4]
    
    # Pre-compute combined static embeddings: emb_mapped * sigmoid(w)
    mapped_embeddings = embeddings[token_mapping]
    sigmoid_w = torch.sigmoid(w).unsqueeze(-1)
    combined_embeddings = mapped_embeddings * sigmoid_w
    
    print(f"📊 Extracted Shapes:")
    print(f"   - Combined Embeddings: {combined_embeddings.shape}")
    print(f"   - Head Linear 1:       {head0_w.shape}")
    print(f"   - Head Linear 2:       {head2_w.shape}")
    
    # Initialize the conversion model
    py_model = Model2VecCoreML(
        combined_embeddings=combined_embeddings,
        head0_weight=head0_w,
        head0_bias=head0_b,
        head2_weight=head2_w,
        head2_bias=head2_b
    )
    py_model.eval()
    
    # Trace the PyTorch module
    dummy_input = torch.zeros((1, 128), dtype=torch.long)
    traced_model = torch.jit.trace(py_model, dummy_input)
    
    # Convert to Core ML program
    print("⚙️ Model2Vec Conversion: Converting JIT traced model to Core ML program (FP16)...")
    input_shape = ct.TensorType(
        name="input_ids",
        shape=(1, ct.RangeDim(1, 4096, default=128)),
        dtype=int
    )
    
    # Use minimum target target containing ML Program and Optimization compatibility
    mlmodel = ct.convert(
        traced_model,
        inputs=[input_shape],
        outputs=[ct.TensorType(name="logits")],
        minimum_deployment_target=ct.target.iOS18
    )
    
    # Remove existing dynamic package paths if they exist
    import shutil
    if os.path.exists(fp16_mlpackage_path):
        shutil.rmtree(fp16_mlpackage_path)
    if os.path.exists(int4_mlpackage_path):
        shutil.rmtree(int4_mlpackage_path)
        
    mlmodel.save(fp16_mlpackage_path)
    print(f"✅ Saved Float16 Core ML model: {fp16_mlpackage_path}")
    
    # Apply post-training quantization to INT4
    print("⚙️ Model2Vec Conversion: Compressing model weights to INT4 precision...")
    op_config = cto.coreml.OpLinearQuantizerConfig(
        mode="linear_symmetric",
        dtype="int4",
        weight_threshold=100 # apply to all layers (embedding is ~7.5M parameters, linear is ~130K/2K)
    )
    config = cto.coreml.OptimizationConfig(global_config=op_config)
    
    # Apply weight compression
    quantized_model = cto.coreml.linear_quantize_weights(mlmodel, config=config)
    quantized_model.save(int4_mlpackage_path)
    
    print(f"✅ Saved Quantized INT4 Core ML model: {int4_mlpackage_path}")
    print("💎 Success: Model2Vec Core ML Pipeline Complete.")

if __name__ == "__main__":
    main()
