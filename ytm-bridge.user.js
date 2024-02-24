// ==UserScript==
// @name         YoutubeMusicSongDetailsScraper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Scrape current song details and send them over websocket to discord RPC client
// @author       -I guess that's me but IDK-
// @match        https://music.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

const WEB_SOCKET_URL = "ws://localhost:12770/discord-ytm-bridge";
let player;
let socket;
let retryCount = 0;
let retryResetTimeout;

const sizeComparer = (a, b) => (a.size > b.size ? -1 : b.size > a.size ? 1 : 0);
const resetRetryCount = () => {
  retryCount = 0;
  if (retryResetTimeout) {
    clearTimeout(retryResetTimeout);
    retryResetTimeout = null;
    retryConnection();
  }
};
const retryConnection = () => {
  if (retryCount >= 5) {
    if (!retryResetTimeout) {
      retryResetTimeout = setTimeout(resetRetryCount.bind(this), 180 * 1000);
      console.log("[Discord Bridge] Will retry connecting in 180s");
    }
    return;
  }
  setTimeout(initConnection.bind(this), 30 * 1000);
  console.log(
    "[Discord Bridge] Will retry connecting in 30s, retries left: ",
    5 - ++retryCount
  );
};
const onSocketConnected = () => {
  console.log(
    `[Discord Bridge] Connection with ${WEB_SOCKET_URL} established.`
  );
  resetRetryCount();
};

const initConnection = () => {
  socket = new WebSocket(WEB_SOCKET_URL);
  socket.onopen = onSocketConnected;
  socket.onclose = retryConnection;
};

const onStateChange = () => {
  try {
    const artists = [];
    const { title } = document.querySelector(
      ".content-info-wrapper .title[title]"
    );
    let album;
    var subtitles = document.querySelectorAll(
      ".content-info-wrapper .subtitle a"
    );

    const thumbnails = player
      .getPlayerResponse()
      .videoDetails.thumbnail.thumbnails?.map((x) => ({
        ...x,
        size: x.height * x.width,
      }));

    const thumbnail = thumbnails.sort(sizeComparer)[0]?.url ?? null;

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
          ?.innerText
      );
    }

    const payload = JSON.stringify({
      duration: player.getDuration(),
      currentTime: player.getCurrentTime(),
      title,
      album,
      artists,
      thumbnail,
      url: player.getVideoData().video_id,
    });

    if (socket?.readyState === socket?.OPEN) {
      socket?.send(payload);
    }
  } catch {
    setTimeout(onStateChange.bind(this), 1000);
  }
};

const onLoad = () => {
  initConnection();
  player = document.querySelector("#player").getPlayer();
  player.addEventListener("onStateChange", onStateChange.bind(this));
};

(() => (window.onload = onLoad))();
