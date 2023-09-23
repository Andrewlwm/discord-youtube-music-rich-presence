public record Song(
    double Duration,
    double CurrentTime,
    PlayerStates State,
    string Title,
    string Album,
    string[] Artists,
    string Thumbnail,
    string Url
);

public enum PlayerStates
{
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    CUED = 5
}