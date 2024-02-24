using System.Net.WebSockets;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using DiscordRPC;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var client = new DiscordRpcClient(builder.Configuration["DiscordAppId"]);

client.Initialize();

app.UseWebSockets();

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/discord-ytm-bridge")
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            try
            {
                await UpdateRichPresence(webSocket, context.RequestAborted);
            }
            catch
            {
                client.ClearPresence();
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


async Task UpdateRichPresence(WebSocket webSocket, CancellationToken ct)
{
    var buffer = new byte[512];
    var receiveResult = await webSocket.ReceiveAsync(
        new ArraySegment<byte>(buffer), ct);

    while (!receiveResult.CloseStatus.HasValue)
    {
        receiveResult = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer), ct);

        Song? song = null;
        try
        {
            song = JsonSerializer.Deserialize<Song>(buffer.AsSpan(0, receiveResult.Count), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
            });
        }
        catch { }

        if (song is null) return;

        var album = !string.IsNullOrEmpty(song.Album) ? (" on " + song.Album) : "";

        var presence = new RichPresence
        {
            State = $"{string.Join(", ", song.Artists)}{album}",
            Details = song.Title.PadRight(2, ' '),
            Timestamps = new Timestamps
            {
                End = DateTime.UtcNow.AddSeconds((int)song.Duration - (int)song.CurrentTime)
            },
            Assets = new Assets
            {
                LargeImageKey = song.Thumbnail,
            },
            Buttons =
                [
                    new Button
                    {
                        Label = "Listen",
                        Url = $"https://music.youtube.com/watch?v={song.Url}"
                    }
                ]
        };

        client.SetPresence(presence);
    }

    await webSocket.CloseAsync(
        receiveResult.CloseStatus.Value,
        receiveResult.CloseStatusDescription,
        ct);
    client.ClearPresence();
}