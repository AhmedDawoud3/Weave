namespace Weave.Domain.Entities;

public class GalleryItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string InputShape { get; set; } = "[]";
    public string Citation { get; set; } = string.Empty;
    public string PaperUrl { get; set; } = string.Empty;
    public string Category { get; set; } = "architecture"; // 'architecture' or 'paper'
    public string GraphPayload { get; set; } = string.Empty; // JSON representing nodes and edges
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
