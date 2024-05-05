export {};

import { User } from "./Models";

export interface ReactionTimeObject {
  id: string;
  reactiontime: string; // Assuming the time is represented as a string
  username: string; // Assuming the username is represented as a string
  points?: number;
  totaltime: string;
}

export interface FastestTotalTimeData {
  username: string;
  totaltime: string;
}

interface UpdatePointsData {
  username: string;
  points: number | undefined;
}
export interface SendInnerTextData {
  username: string;
  innerText: string;
}
interface PlayerScores {
  [playerName: string]: number;
}

interface GameOverData {
  id: string;
  username: string;
  points: number; // Use `number` for points
}
interface GameOverDataMultiple {
  players: GameOverData[];
}

// Events emitted by the server to the client
export interface ServerToClientEvents {
  // sendTimer: (username: string, timer: string) => void;
  // showTimer: (userId: string, timer: string) => void;
  showReactTime: (username: string, reactiontime: string) => void;
  playerJoined: (usernamesingame: string[]) => void;
  disconnect: (reason: string) => void;
  gameReady: () => void;
  randomEvent: (data: { delay: number; elementId: string }) => void;
  hideVirusForAll: (data: { virusId: string }) => void;
  fastestTotalTime: (username: string, totaltime: string) => void;
  roomCreated: (username: string, roomName: string) => void;
  updatePoints: (data: UpdatePointsData) => void;
  // showScore: (score:number) => void;
  reactionTimeRecorded: ReactionTimeObject;
  GameResultMongo: (scoresArray: PlayerScores[]) => void;
  gameOver: (data: GameOverDataMultiple) => void;
  requestInnerText: () => void;
  sendingPlayersReactionTime: (reactionTimeArray: ReactionTimeObject[]) => void;
  UserDisconnect: (username: string) => void;
}

export interface PlayerJoinResponse {
  success: boolean;
  room: RoomInfo | null;
}

export interface RoomInfo {
  [x: string]: any;
  id: string;
  name: string;
  users: User[];
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
  showReactTime: (username: string, reactiontime: string) => void;
  // showTimer: (userId: string, timer: string) => void;
  // sendTimer: (username: string, timer: string) => void;
  playerJoinRequest: (
    username: string,
    callback: (response: PlayerJoinResponse) => void
  ) => void;
  virusClicked: (data: { virusId: string }) => void;
  reactionTimeRecorded: (reactionTimeObject: ReactionTimeObject) => void;
  sendInnerText: (data: SendInnerTextData) => void;

  // addScore: (score: number) => void;
  //   roomName: () => void;
}

// export interface addScoreResponse {

//   reactionTimeRecorded: (reactionTimeObject: ReactionTimeObject) => void;
// }

// Score payload
export interface ReactionTime {
  // roomId: string;
  score: number;
  reactiontime: string;
  username: string;
}

// Player Join Response
export interface PlayerJoinResponse {
  success: boolean;
}
