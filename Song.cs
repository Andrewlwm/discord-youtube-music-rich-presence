public record Song(
    double Duration,
    double CurrentTime,
    string Title,
    string Album,
    string[] Artists,
    string? Thumbnail,
    string Url
);
