using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Weave.API.Hubs;

/// <summary>
/// SignalR hub stub for real-time training metric broadcasting (Task 2).
/// During training, the engine will push step/epoch metrics here,
/// and connected clients will receive live updates.
/// </summary>
[Authorize]
public class TrainingHub : Hub
{
    /// <summary>
    /// Called when a client connects to the training hub.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the training hub.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Allows a client to join a specific training run's group
    /// to receive targeted metric updates.
    /// </summary>
    public async Task JoinTrainingRun(string runId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"training_{runId}");
    }

    /// <summary>
    /// Allows a client to leave a training run's group.
    /// </summary>
    public async Task LeaveTrainingRun(string runId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"training_{runId}");
    }

    // ---- Server-side broadcast methods (called from services, not clients) ----
    // These will be invoked via IHubContext<TrainingHub> in Task 2:
    //
    // await _hubContext.Clients.Group($"training_{runId}")
    //     .SendAsync("StepMetrics", metricsPayload);
    //
    // await _hubContext.Clients.Group($"training_{runId}")
    //     .SendAsync("EpochMetrics", metricsPayload);
    //
    // await _hubContext.Clients.Group($"training_{runId}")
    //     .SendAsync("TrainingComplete", completePayload);
}
