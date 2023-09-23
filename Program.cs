using System.Net.WebSockets;
using System.Text.Json;
using Discord;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var webSocketOptions = new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromMinutes(1)
};
Discord.Discord? discord = null;
ActivityManager? activityManager = null;
InitDiscord();

app.UseWebSockets(webSocketOptions);

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ws")
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            try
            {
                await UpdateRichPresence(webSocket);
            }
            catch (ResultException)
            {
                InitDiscord();
            }
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }
    else
    {
        await next(context);
    }
});

app.Run("http://localhost:12770");


async Task UpdateRichPresence(WebSocket webSocket)
{
    var buffer = new byte[1024 * 4];
    var receiveResult = await webSocket.ReceiveAsync(
        new ArraySegment<byte>(buffer), CancellationToken.None);

    while (!receiveResult.CloseStatus.HasValue)
    {
        receiveResult = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer), CancellationToken.None);

        Song? song = null;
        try
        {
            song = JsonSerializer.Deserialize<Song>(buffer.AsSpan(0, receiveResult.Count), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch { }

        if (song is null) return;

        var album = !string.IsNullOrEmpty(song.Album) ? (" on " + song.Album) : "";

        var activity = new Activity
        {
            Type = ActivityType.Listening,
            State = $"{string.Join(", ", song.Artists)}{album}",
            Details = song.Title,
            Timestamps = new ActivityTimestamps
            {
                End = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + (int)song.Duration - (int)song.CurrentTime
            },
            Assets = new ActivityAssets
            {
                LargeImage = song.Thumbnail,
            },
        };

        activityManager?.UpdateActivity(activity, (result) => { });
        discord?.RunCallbacks();
    }

    await webSocket.CloseAsync(
        receiveResult.CloseStatus.Value,
        receiveResult.CloseStatusDescription,
        CancellationToken.None);
}


void InitDiscord()
{
    discord = new Discord.Discord(YOUR_APP_ID, (ulong)CreateFlags.NoRequireDiscord);
    activityManager = discord.GetActivityManager();
}