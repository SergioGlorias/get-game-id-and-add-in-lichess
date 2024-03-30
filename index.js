const cron = require("node-cron");
const config = require("./config.json");
const { writeFile, readFile } = require("node:fs/promises");

const headers = {
  Authorization: `Bearer ${config.LichessToken}`,
  Accept: "application/json",
  "content-type": "application/x-www-form-urlencoded",
};

let lastGame = "";

cron.schedule("*/5 * * * * *", async () => {
  console.info("Execute");

  let userGame = await fetch(
    `https://lichess.org/api/users/status?ids=${config.LichessUser1}&withGameIds=true`,
    {
      method: "GET",
      headers,
    }
  )
    .then((res) => res.json())
    .then((json) => json[0].playingId);

  console.info(userGame);
  if (!userGame) return;
  if (lastGame === userGame) return;

  lastGame = userGame;

  let gamePlayers = await fetch(
    `https://lichess.org/game/export/${userGame}?moves=false&tags=false&clocks=false&evals=false&opening=false&division=false`,
    {
      method: "GET",
      headers,
    }
  )
    .then((res) => res.json())
    .then((json) => {
      return {
        white: json.players.white.user.id,
        black: json.players.black.user.id,
      };
    });

  console.info(gamePlayers);
  if (![gamePlayers.white, gamePlayers.black].includes(config.LichessUser2))
    return;

  let ids = await readFile("./ids.txt", {
    encoding: "utf-8",
  });

  ids = ids.trim().split(" ");

  if (ids.includes(userGame)) return;

  ids.push(userGame);

  ids = ids.join(" ");

  await fetch(`https://lichess.org/broadcast/round/${config.RoundId}/edit`, {
    method: "POST",
    headers,
    body: new URLSearchParams({
      name: "Match",
      syncUrl: ids,
    }),
  })
    .then((res) => res.json())
    .then((json) => console.log(json));

  await writeFile("./ids.txt", ids, {
    encoding: "utf-8",
  });
  console.log("GG");
});
