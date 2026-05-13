# Compiler Module

The compiler module transforms a validated `GraphConfig` into a runnable PyTorch `nn.Module`. It handles topological sorting, cycle detection, shape inference, and dynamic module construction.

## Architecture

```
compiler/
├── __init__.py          # Public exports: GraphCompiler, WeaveBlock, get_loss_function, get_optimizer
├── compiler.py          # GraphCompiler — main compilation and shape inference logic
├── block.py             # WeaveBlock — dynamically constructed nn.Module
├── factory.py           # ComponentFactory — registry pattern for layer creation
└── modules.py           # AddModule, ConcatModule, MultiplyModule — multi-input wrappers
```

## Flow

1. User sends a `GraphConfig` to the API
2. `GraphCompiler.compile()` validates and topologically sorts the graph
3. `WeaveBlock` is constructed with the execution order and operations
4. `ComponentFactory.create_layer()` instantiates each PyTorch module from the node config
5. Dummy tensors are passed through for shape inference

## Components

| Component | Description | Details |
|-----------|-------------|---------|
| [GraphCompiler](graph-compiler.md) | Main compilation and validation engine | Topological sort, cycle detection, shape inference |
| [WeaveBlock](weave-block.md) | Dynamic PyTorch module | Executes forward pass in topological order |
| [ComponentFactory](component-factory.md) | Layer creation registry | Maps node types to PyTorch modules |
| [Custom Modules](custom-modules.md) | Multi-input wrappers | Add, Concat, Multiply operations |
