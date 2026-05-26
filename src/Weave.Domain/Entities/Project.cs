namespace Weave.Domain.Entities;

/// <summary>
/// A Weave project containing one or more subgraphs (neural network designs)
/// and their associated training states.
/// </summary>
public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Foreign key to the owning user
    public string UserId { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<SubGraph> SubGraphs { get; set; } = new List<SubGraph>();
    public ICollection<NetworkState> NetworkStates { get; set; } = new List<NetworkState>();
}
