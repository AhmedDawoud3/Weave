using System.Text.Json;
using System.Text.Json.Serialization;

namespace Weave.Application.DTOs.Engine;

// =============================================================================
// NODE, EDGE, and GRAPH DTOs — Mirror Python schemas.py Sections 2-5
// =============================================================================

/// <summary>
/// A single node in the visual graph. Uses polymorphic deserialization
/// via the "type" discriminator field, matching Python's NodeConfig union.
/// Params is kept as JsonElement for maximum flexibility with the engine.
/// </summary>
public class NodeConfigDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("params")]
    public JsonElement? Params { get; set; }

    // Block nodes have a nested graph + repeat
    [JsonPropertyName("graph")]
    public GraphConfigDto? Graph { get; set; }

    [JsonPropertyName("repeat")]
    public int? Repeat { get; set; }
}

/// <summary>
/// An edge connecting two nodes in the graph.
/// Matches Python EdgeConfig: {"source": "conv1", "target": "relu1"}
/// </summary>
public class EdgeConfigDto
{
    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;
}

/// <summary>
/// The complete graph configuration: all nodes + all edges.
/// Matches Python GraphConfig exactly.
/// </summary>
public class GraphConfigDto
{
    [JsonPropertyName("nodes")]
    public List<NodeConfigDto> Nodes { get; set; } = new();

    [JsonPropertyName("edges")]
    public List<EdgeConfigDto> Edges { get; set; } = new();
}
