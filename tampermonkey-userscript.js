const WEB_SOCKET_URL = "ws://localhost:12770/ws";
let connection;

const initConnection = () => {
  connection = new WebSocket(WEB_SOCKET_URL);
  connection.onopen = () =>
    console.log(`Connection with ${WEB_SOCKET_URL} established.`);

  connection.onerror = (error) => {
    console.log(`Error trying to connect to ${WEB_SOCKET_URL}: ${error}`);
    setTimeout(() => initConnection(), 500);
  };

  connection.onmessage = () => {};
  connection.onclose = () => setTimeout(() => initConnection(), 500);
};

const onLoad = () => {
  initConnection();
  const player = document.querySelector("#player").getPlayer();

  player.addEventListener("onStateChange", (state) => {
    if (![0, 1, 2, 5].includes(state)) return;
    try {
      const artists = [];
      const { title } = document.querySelector(
        ".content-info-wrapper .title[title]"
      );
      let album;
      var subtitles = document.querySelectorAll(
        ".content-info-wrapper .subtitle a"
      );

      const thumbnail = document.querySelector("#thumbnail > #img[src]").src;

      const url = `https://music.youtube.com/watch?v=${
        player.getVideoData().video_id
      }`;

      subtitles.forEach(({ innerText, href }) => {
        if (href?.includes("channel")) {
          artists.push(innerText);
        }
        if (href?.includes("browse")) {
          album = innerText;
        }
      });

      if (!artists.length) {
        artists.push(
          document.querySelector(".content-info-wrapper .subtitle span")
            .innerText
        );
      }

      const payload = JSON.stringify({
        duration: player.getDuration(),
        currentTime: player.getCurrentTime(),
        state,
        title,
        album,
        artists,
        thumbnail,
        url,
      });

      if (connection?.OPEN) {
        connection?.send(payload);
      }
    } catch {}
  });
};

(() => (window.onload = onLoad))();
