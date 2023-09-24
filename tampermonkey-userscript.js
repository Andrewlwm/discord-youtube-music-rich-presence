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

const WEB_SOCKET_URL = "ws://localhost:12770/ws";
let player;
let connection;

const sizeComparer = (a, b) => (a.size > b.size ? -1 : b.size > a.size ? 1 : 0);

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
        document.querySelector(".content-info-wrapper .subtitle span").innerText
      );
    }
    const payload = JSON.stringify({
      duration: player.getDuration(),
      currentTime: player.getCurrentTime(),
      title,
      album,
      artists,
      thumbnail,
    });

    if (connection?.OPEN) {
      connection?.send(payload);
    }
  } catch {
    setTimeout(() => onStateChange(), 500);
  }
};

const onLoad = () => {
  initConnection();
  player = document.querySelector("#player").getPlayer();
  player.addEventListener("onStateChange", onStateChange.bind(this));
};

(() => (window.onload = onLoad))();
