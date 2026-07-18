import pytest
from pydantic import ValidationError, TypeAdapter
from schemas import NodeConfig, InputPortNode, OutputPortNode, StackNode, ModuleNode, ConfigurableParam

def test_deserialize_new_nodes():
    # Test InputPort
    inp = TypeAdapter(NodeConfig).validate_python({"id": "p1", "type": "InputPort", "params": {"name": "x"}})
    assert inp.type == "InputPort"
    assert inp.params.name == "x"

    # Test ModuleNode
    mod = TypeAdapter(NodeConfig).validate_python({
        "id": "m1",
        "type": "Module",
        "name": "MyModule",
        "graph": {"nodes": [], "edges": []},
        "configurable_params": [
            {"inner_node_id": "conv1", "param_name": "out_channels", "display_name": "ch", "default_value": 32}
        ],
        "param_overrides": {"ch": 64}
    })
    assert mod.type == "Module"
    assert mod.name == "MyModule"
    assert len(mod.configurable_params) == 1
    assert mod.param_overrides["ch"] == 64
