import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  PlayerJoinResponse,
  ReactionTimeObject,
  ServerToClientEvents,
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;

const parentVirusEl = document.querySelector("#grid") as HTMLDivElement;
const gridEl = document.querySelector("#grid") as HTMLDivElement;
const userForm = document.querySelector("#user-form") as HTMLFormElement;
const userInput = document.querySelector("#user-input") as HTMLInputElement;
const welcomeMsg = document.querySelector("#welcome-message") as HTMLDivElement;
const waitingForPlayer = document.querySelector(
  "#waiting-lobby"
) as HTMLDivElement;
const gameWrapEl = document.querySelector("#game-wrap") as HTMLDivElement;
const gameOn = document.querySelector("#game-on") as HTMLDivElement;
const startView = document.querySelector("#start-view") as HTMLDivElement;
const borderGridEl = document.querySelector("#border-grid") as HTMLDivElement;
const gameView = document.querySelector("#grid") as HTMLDivElement;
const messagesEl = document.querySelector("#messages") as HTMLDivElement;
const scoreTableEl = document.querySelector("#scoretable") as HTMLDivElement;
const playersMenu = document.querySelector("#players-menu") as HTMLDivElement;
const startBtnEl = document.querySelector("#startBtn") as HTMLButtonElement;
const fastestPlayerEl = document.querySelector(
  "#fastestPlayer"
) as HTMLDivElement;

const resultsDiv = document.getElementById("gameResults") as HTMLDivElement;
const show10El = document.querySelector("#show10") as HTMLHeadingElement;
const exitgame = document.querySelector("#exitgame") as HTMLButtonElement;
const endpage = document.querySelector("#endPage") as HTMLDivElement;
const gameResultElement = document.getElementById(
  "endPageGameResult"
) as HTMLDivElement;
const showMatchesMsg = document.querySelector(
  ".showTenMatches"
) as HTMLDivElement;

let username: string | null = null;

let isGameReady = false;

let startTime: number | undefined;
let elapsedTime: number = 0;
let timerInterval: number | undefined;

console.log("Connecting to Socket.IO Server at:", SOCKET_HOST);
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SOCKET_HOST);

socket.on("connect", () => {
  console.log("💥 Connected to the server", SOCKET_HOST);
  console.log("🔗 Socket ID:", socket.id);
  fastestPlayerFunction();
  gridEl.classList.add("hide-virus");
  borderGridEl.classList.add("hide-virus");
  GameResultMongofunction();
});

socket.on("gameReady", () => {
  console.log("Game is ready, listening for random events.");
  isGameReady = true;
  reset();
});

let userTimer: number | undefined;

const checkUserClicked = (currentElement: any) => {
  userTimer = setTimeout(() => {
    stop();
    stopTimerTwo();
    const virusId = currentElement.getAttribute("id");
    if (virusId !== null) {
      socket.emit("virusClicked", { virusId });
    }
    setTimeout(function () {
      currentElement.classList.add("hide");
    }, 200);
  }, 10000);
};

socket.on("randomEvent", (data) => {
  if (!isGameReady) {
    return;
  }
  const { delay, elementId } = data;
  let currentElement = document.getElementById(elementId);

  if (currentElement) {
    setTimeout(() => {
      console.log(`first Element to update after ${delay}ms: ${elementId}`);
      // element.style.backgroundColor = "red";
      if (currentElement) {
        console.log("Element to update after", currentElement);
        currentElement.classList.remove("hide");
        waitingForPlayer.classList.add("hide");
        gameOn.classList.remove("hide");
        borderGridEl.classList.remove("hide2");
        start();
        startTimerTwo();
        checkUserClicked(currentElement);
      }
    }, delay);
  } else {
    console.log(`Element with ID ${elementId} does not exist.`);
  }
});

socket.on("UserDisconnect", (username) => {
  alert(`${username} left, Going back to lobby`);

  setTimeout(() => {
    refreshPage();
  }, 2000);
});

socket.on("gameOver", (data) => {
  data.players.forEach((player) => {
    console.log(`${player.username}: ${player.points} points`);
  });

  gameResultElement.innerHTML = "";
  endpage.classList.remove("hide2");
  gameWrapEl.classList.add("hide2");
  borderGridEl.classList.add("hide-virus");
  gridEl.classList.add("hide2");
  welcomeMsg.classList.add("hide");
  startBtnEl.classList.add("hide");
  fastestPlayerEl.classList.add("hide");
  resultsDiv.classList.add("hide2");
  show10El.classList.add("hide");
  gameOn.classList.add("hide");
  gameView.classList.add("hide");
  playersMenu.classList.add("hide");

  if (gameResultElement) {
    data.players.forEach((player) => {
      const playerElement = document.createElement("div");
      playerElement.innerHTML = `<strong>${player.username}</strong>: ${player.points} points`;

      gameResultElement.appendChild(playerElement);
    });
  }
});

exitgame.addEventListener("click", () => {
  gameWrapEl.classList.add("hide2");
  borderGridEl.classList.add("hide-virus");
  endpage.classList.add("hide2");
  startView.classList.remove("hide");
  welcomeMsg.classList.remove("hide");
  waitingForPlayer.classList.add("hide");
  gameOn.classList.add("hide");

  gameView.classList.add("hide");
  playersMenu.classList.add("hide");
  fastestPlayerEl.classList.remove("hide");
  refreshPage();
});

socket.on("disconnect", () => {
  console.log("💀 Disconnected from the server:", SOCKET_HOST);
});

socket.io.on("reconnect", () => {
  console.log("🍽️ Reconnected to the server:", SOCKET_HOST);
  console.log("🔗 Socket ID:", socket.id);
});

const addNoticeToGame = (msg: string) => {
  console.log("addnotice to game msg", msg);
  const usernamesArray = msg.split(",");

  messagesEl.innerHTML = "";

  usernamesArray.forEach((username) => {
    const newNoticeEl = document.createElement("li");
    newNoticeEl.classList.add("content");
    newNoticeEl.textContent = username.trim();

    const existingNotices = messagesEl.querySelectorAll("li.content");

    if (existingNotices.length === 0) {
      messagesEl.appendChild(newNoticeEl);
    } else {
      const sortedNotices = Array.from(existingNotices).sort((a, b) => {
        const textA = a.textContent || "";
        const textB = b.textContent || "";
        return textA.localeCompare(textB);
      });

      let added = false;
      for (let i = 0; i < sortedNotices.length; i++) {
        if (username.localeCompare(sortedNotices[i].textContent || "") < 0) {
          messagesEl.insertBefore(newNoticeEl, sortedNotices[i]);
          added = true;
          break;
        }
      }

      if (!added) {
        messagesEl.appendChild(newNoticeEl);
      }
    }
  });
};

userForm.addEventListener("submit", (e) => {
  e.preventDefault();

  username = userInput.value.trim();

  if (username) {
    startView.classList.add("hide");
    welcomeMsg.classList.add("hide");
    borderGridEl.classList.remove("hide-virus");
    gameView.classList.remove("hide");
    gridEl.classList.remove("hide-virus");
    playersMenu.classList.remove("hide");
    waitingForPlayer.classList.remove("hide");
    fastestPlayerEl.classList.add("hide");
    resultsDiv.classList.add("hide2");
    show10El.classList.add("hide");
    showMatchesMsg.classList.add("hide");
  }

  socket.emit("playerJoinRequest", username, handlePlayerJoinRequestCallback);
  console.log("Emitted 'playerJoinRequest' event to server: ", username);
});

function refreshPage() {
  window.location.reload();
}

//Functions
const firstPage = (status: string) => {
  startView.classList.toggle(status);
  welcomeMsg.classList.toggle(status);
};

const gamePage = (status: string) => {
  borderGridEl.classList.toggle(status);
  gameView.classList.toggle(status);
  playersMenu.classList.toggle(status);
};

const handlePlayerJoinRequestCallback = (response: PlayerJoinResponse) => {
  if (!response.success) {
    gamePage("hide");

    setTimeout(function () {
      alert("Could not join the game (for some reasons)");
      firstPage("hide");
      startBtnEl.disabled;
    }, 800);

    return;
  }

  borderGridEl.classList.remove("hide2");
  gameView.classList.remove("hide");
};

socket.on("playerJoined", (username) => {
  addNoticeToGame(`${username}`);
});

socket.on("showReactTime", (username, reactiontime) => {
  const ulEl = document.querySelector("#react")!;

  const existingLi = ulEl?.querySelector("li");
  if (existingLi) {
    ulEl.removeChild(existingLi);
  }

  ulEl.innerHTML = `<li>${username}<span>${reactiontime}</span></li>`;
});

parentVirusEl.addEventListener("click", (e) => {
  e.preventDefault();

  const clicktarget = e.target as HTMLImageElement;
  const virustarget = clicktarget.className;

  if (virustarget === "virus-div") {
    clickOnVirus(clicktarget);
    function clickOnVirus(clicktarget: HTMLImageElement) {
      console.log(clicktarget, "Yes, it's a virus");
      clearTimeout(userTimer);
      stop();
      stopTimerTwo();

      const virusId = clicktarget.getAttribute("id");
      if (virusId !== null) {
        socket.emit("virusClicked", { virusId });
      }
      setTimeout(function () {
        clicktarget.classList.add("hide");
      }, 200);
    }
  }
});
socket.on("hideVirusForAll", ({ virusId }) => {
  const virusElement = document.getElementById(virusId);
  if (virusElement) {
  }
});

let playerScores: { [key: string]: number | undefined } = {};

socket.on("updatePoints", (data) => {
  messagesEl.classList.add("hide2");
  const { username, points } = data;

  playerScores[username] = points;

  let scoreListUl = scoreTableEl.querySelector("ul.notice");
  if (!scoreListUl) {
    scoreListUl = document.createElement("ul") as HTMLDListElement;
    scoreListUl.classList.add("notice");
    scoreTableEl.appendChild(scoreListUl);
  } else {
    scoreListUl.innerHTML = "";
  }

  Object.entries(playerScores).forEach(([username, score]) => {
    const scoreItem = document.createElement("li");
    scoreItem.innerHTML = `${username}<span>${score}</span>`;
    if (!scoreListUl) {
      return;
    }
    scoreListUl.appendChild(scoreItem);
  });
  sortScoreDisplayAlphabetically();
});

const GameResultMongofunction = () => {
  socket.on("GameResultMongo", (scoresArray) => {
    resultsDiv.innerHTML = "";

    scoresArray.forEach((scores, index) => {
      const gameDiv = document.createElement("div");
      gameDiv.classList.add("game-scores");
      gameDiv.innerHTML = `<h6>Game ${index + 1} Scores:</h6>`;

      const scoresList = document.createElement("ul");
      scoresList.classList.add("ulgames");
      Object.entries(scores).forEach(([playerName, score]) => {
        const scoreItem = document.createElement("li");
        scoreItem.innerHTML = `${playerName} : <strong>${score}`;
        scoresList.appendChild(scoreItem);
      });

      gameDiv.appendChild(scoresList);
      resultsDiv.appendChild(gameDiv);
    });
    sortScoreDisplayAlphabetically();
  });
};

socket.on("requestInnerText", () => {
  const innerText =
    document.getElementById("totaltime")?.innerText ?? "00.00.00.00";
  console.log("recieved note to send totaltime");

  socket.emit("sendInnerText", { username: username!, innerText: innerText });
  console.log("sending");
});

socket.on("sendingPlayersReactionTime", (reactionTimeArray) => {
  console.log("Players reaction time: ", reactionTimeArray);
});

function sortScoreDisplayAlphabetically() {
  const ul = scoreTableEl.querySelector("ul");

  if (!ul) return;

  const listItems = ul.querySelectorAll("li");
  const itemsArray = Array.from(listItems);

  const sortedItems = itemsArray.sort((a, b) => {
    const textA = (a.textContent || "").toUpperCase();
    const textB = (b.textContent || "").toUpperCase();
    return textA.localeCompare(textB);
  });

  sortedItems.forEach((item) => ul.appendChild(item));
}

function timeToString(time: number): string {
  let diffInHrs = time / 3600000;
  let hours = Math.floor(diffInHrs);

  let diffInMin = (diffInHrs - hours) * 60;
  let minutes = Math.floor(diffInMin);

  let diffInSec = (diffInMin - minutes) * 60;
  let seconds = Math.floor(diffInSec);

  let diffInMs = (diffInSec - seconds) * 1000;
  let ms = Math.floor(diffInMs);

  let formattedMM = minutes.toString().padStart(2, "0");
  let formattedSS = seconds.toString().padStart(2, "0");
  let formattedMS = ms.toString().padStart(3, "0");

  return `${formattedMM}:${formattedSS}:${formattedMS}`;
}

function print(txt: string): void {
  const stopwatch: HTMLElement | null = document.getElementById("timer");
  if (stopwatch) {
    stopwatch.innerHTML = txt;
  }
}

function start(): void {
  reset();
  startTime = Date.now() - elapsedTime;
  timerInterval = window.setInterval(() => {
    elapsedTime = Date.now() - (startTime as number);
    print(timeToString(elapsedTime));
  }, 10) as unknown as number;
}
let timerTwoIntervalId: number | undefined;
let elapsedTimeTwo: number = 0;
let totaltime = document.getElementById("totaltime") as any;

function startTimerTwo() {
  const startTime = Date.now() - elapsedTimeTwo;
  timerTwoIntervalId = window.setInterval(() => {
    const now = Date.now();
    const newElapsedTime = now - startTime;
    const totaltimer = timeToString(newElapsedTime);

    totaltime.innerText = totaltimer;
    elapsedTimeTwo = newElapsedTime;
  }, 10);
}

function stopTimerTwo() {
  if (timerTwoIntervalId !== undefined) {
    clearInterval(timerTwoIntervalId);
    timerTwoIntervalId = undefined;
  }
}

function stop(): void {
  if (timerInterval !== undefined) {
    clearInterval(timerInterval);
  }
  const stopwatch: HTMLElement | null = document.getElementById("timer");
  const reactionTimeObject: ReactionTimeObject = {
    reactiontime: stopwatch?.innerText as string,
    username: username as string,
    id: socket.id as string,
    totaltime: totaltime,
  };
  socket.emit("reactionTimeRecorded", reactionTimeObject);
}

const stopwatch: HTMLElement | null = document.getElementById("timer");
const reactionTimeObject: ReactionTimeObject = {
  reactiontime: stopwatch?.innerText as string,
  username: username as unknown as string,
  id: socket.id as string,
  totaltime: totaltime,
};

const timer = reactionTimeObject.reactiontime;

if (!timer) {
  console.log("The timer doesnt show yet on the DOM", timer);
}

const ulEl = document.querySelector(".notice");
if (ulEl) {
  const liElements = ulEl.querySelectorAll("li");

  console.log("liElements", liElements);

  const timerValue = timer;
  liElements.forEach((li) => {
    console.log("liiiiiiii: ", li);

    const player: any = li.textContent;

    if (!player) {
      console.log("No player", player);
    }

    const firstWord = player.split(" ")[0].trim();
    console.log(firstWord);

    const timerEl = document.querySelector("#timer") as HTMLDivElement;

    if (firstWord === reactionTimeObject.username) {
      timerEl.innerHTML += `<h5>${firstWord}<span>${timerValue}</span></h5>`;
    }
  });
} else {
  console.log("Element with class 'notice' not found.");
}

const messageDiv = document.getElementById("messages");
if (messageDiv) {
  const liElements: any = messageDiv.querySelectorAll("li");

  const timerValue = timer;
  liElements.forEach(
    (li: {
      insertAdjacentHTML(arg0: string, spanElement: string): unknown;
      textContent: string;
    }) => {
      const playerName = li.textContent;

      const timerEl = document.querySelector("#timer") as HTMLDivElement;

      if (playerName === reactionTimeObject.username) {
        timerEl.innerHTML += `<h5>${playerName}<span>${timerValue}</span></h5>`;
      }
    }
  );
} else {
  console.log("Element with id 'messages' not found.");
}

function reset(): void {
  if (timerInterval !== undefined) {
    clearInterval(timerInterval);
  }
  elapsedTime = 0;
  print("00:00:00.000");
}
const fastestPlayerFunction = () => {
  socket.on("fastestTotalTime", (data: any) => {
    fastestPlayerEl.innerHTML = `<h4>Time to beat: ${data.totaltime}<br> by player:<br> <strong style="color: limegreen;">${data.username}</strong></h4>`;
  });
};
