namespace Weave.Domain.Entities;

/// <summary>
/// Stores training status and historical metrics (Loss/Accuracy)
/// for a specific training run within a project.
/// </summary>
public class NetworkState
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RunId { get; set; } = string.Empty;

    /// <summary>
    /// Current status of the training run: running, paused, completed, failed, stopped.
    /// </summary>
    public string Status { get; set; } = "created";

    public int? CurrentEpoch { get; set; }
    public int? TotalEpochs { get; set; }

    /// <summary>
    /// Full metrics history serialized as JSON — array of epoch metric snapshots.
    /// </summary>
    public string MetricsHistoryJson { get; set; } = "[]";

    /// <summary>
    /// Best metrics achieved during training, serialized as JSON.
    /// </summary>
    public string? BestMetricsJson { get; set; }

    /// <summary>
    /// Snapshot of the training configuration used for this run.
    /// </summary>
    public string? ConfigSnapshotJson { get; set; }

    public string? CheckpointPath { get; set; }
    public double? DurationSeconds { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Foreign key
    public Guid ProjectId { get; set; }
}
