namespace Weave.Domain.Entities;

/// <summary>
/// Stores a serialized visual graph state (nodes + edges) as JSON.
/// Each project can have multiple subgraph revisions or variants.
/// </summary>
public class SubGraph
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The full graph state serialized as JSON — contains nodes, edges,
    /// and visual positions from the React Flow editor.
    /// </summary>
    public string GraphJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Foreign key
    public Guid ProjectId { get; set; }
}
