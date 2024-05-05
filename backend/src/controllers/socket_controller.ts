import Debug from "debug";
import { Server, Socket } from "socket.io";
import {
	ClientToServerEvents,
	FastestTotalTimeData,
	ReactionTimeObject,
	ServerToClientEvents,
} from "@shared/types/SocketTypes";
import prisma from "../prisma";

import { Prisma, Totaltime } from "@prisma/client";
import {
	getPlayersInRoom,
	getUserPoint,
	getUserRoom,
} from "../services/UserService";
import { getRooms, getUserRoomName } from "../services/RoomService";

const debug = Debug("backend:socket_controller");
let playerCount: string[] = [];
let rounds = 0;
let totalPoints = 0;
let reactionTimeArray: ReactionTimeObject[] = [];

let reactionTimes: Totaltime[] = [];
let reactionTimesByRoom: { [roomName: string]: ReactionTimeObject[] } = {};

export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	broadcastFastestReactionTime(io);
	debug("🙋 A user connected", socket.id);
	fetchAndEmitGameResults(io);
	emitFastestTotaltime(io);

	socket.on("playerJoinRequest", async (username, callback) => {
		playerCount.push(socket.id);
		console.log("PlayerCount: ", playerCount);

		debug("Player %s wants to join the game", username);

		const findNewRoom = generateRoomName();

		const rooms = await getRooms();

		const roomWithOneUser = rooms.find((room) => room.users.length === 1);

		if (roomWithOneUser) {
			const user = await prisma.user_player.create({
				data: {
					id: socket.id,
					username,
					roomName: roomWithOneUser.name,
				},
			});
			console.log("User players created: ", user);
			console.log("Found a room with one user:", roomWithOneUser);
			socket.join(roomWithOneUser.name);

			const playersInNewRoom = await getPlayersInRoom(
				roomWithOneUser.name
			);
			playersInNewRoom.forEach((player) => {
				console.log("playersinroomforeach", player.username);
			});
			const usernamesingame = playersInNewRoom.map(
				(player) => player.username
			);

			io.to(roomWithOneUser.name).emit("playerJoined", usernamesingame);
			io.to(roomWithOneUser.name).emit("gameReady");
			playerScores = {};
			console.log("playerScores here: ", playerScores);
			rounds = 0;
			totalPoints = 0;

			broadcastRandomEvent();

			console.log(
				"---------------------------------",
				roomWithOneUser.users
			);
		} else {
			console.log("No room found with one user. Creating a new room.");
			const newRoom = await prisma.room.create({
				data: {
					name: findNewRoom,
				},
			});

			const user = await prisma.user_player.create({
				data: {
					id: socket.id,
					username,
					roomName: newRoom.name,
				},
			});

			debug("4. Created a new user: %o", user);
			const playersInNewRoomforeach = await getPlayersInRoom(
				newRoom.name
			);
			playersInNewRoomforeach.forEach((player) => {
				console.log("playersinroomforeach", player.username);
			});
			const usernamesingame = playersInNewRoomforeach.map(
				(player) => player.username
			);

			io.to(newRoom.name).emit("playerJoined", usernamesingame);

			io.emit("roomCreated", username, newRoom.name);

			const playersInNewRoom = await getPlayersInRoom(newRoom.name);

			callback({
				success: true,
				room: {
					id: newRoom.id,
					name: newRoom.name,
					users: playersInNewRoom,
					reaction_time: reactionTimeArray,
				},
			});

			// Player joins the new room
			socket.join(newRoom.name);

			console.log("newRoom name: ", newRoom.name);
			console.log("username: ", username);

			io.to(newRoom.name).emit("roomCreated", username, newRoom.name);

			if (playerCount.length === 2) {
				io.to(newRoom.name).emit("gameReady");

				broadcastRandomEvent();
			} else {
				console.log("waiting for player");

				io.to(newRoom.name).emit("playerJoined", usernamesingame);
			}
		}
	});

	socket.on("virusClicked", async ({ virusId }) => {
		io.emit("hideVirusForAll", { virusId });
	});

	socket.on(
		"reactionTimeRecorded",
		async (reactionTimeObject: ReactionTimeObject) => {
			let userRoomName = await getUserRoomName(reactionTimeObject.id);

			if (userRoomName === null) {
				console.log("No room was found for the user");
				return; // Exit the event listener if no room name was retrieved
			}
			if (!reactionTimesByRoom[userRoomName]) {
				reactionTimesByRoom[userRoomName] = [];
			}
			reactionTimesByRoom[userRoomName].push(reactionTimeObject);
			console.log(
				`Reaction time recorded in room ${userRoomName}:`,
				reactionTimesByRoom[userRoomName]
			);

			// const [player1, player2] = reactionTimeArray;
			// console.log("Player 1 & Player 2 names inclusive their reactions time: ", player1, player2);

			socket
				.to(userRoomName)
				.emit(
					"showReactTime",
					reactionTimeObject.username,
					reactionTimeObject.reactiontime
				);

			// io.to(userRoom?.roomName).emit("showReactTime", reactionTimeObject.username, reactionTimeObject.reactiontime);
			// console.log("Username and their reaction time : ", reactionTimeObject.username, reactionTimeObject.reactiontime);

			// Wait for both players to record their reaction times
			if (reactionTimesByRoom[userRoomName].length === 2) {
				// Find the player with the fastest reaction time and update points

				const fastestPlayer = findAndAwardFastestPlayer(
					reactionTimesByRoom[userRoomName]
				);

				try {
					// 	const reactlog = await prisma.reaction_time.create({
					// data: reactionTimeObject,
					// });
					// Find the user by username (assuming username uniqueness for this operation)
					const user = await prisma.user_player.findFirst({
						where: { id: fastestPlayer.id },
					});

					if (user) {
						// User found, proceed with updating points
						await prisma.user_player.update({
							where: { id: user.id },
							data: { points: fastestPlayer.points },
						});

						console.log(
							`Points updated for ${fastestPlayer.username} ${fastestPlayer.points}`
						);
					} else {
						// Handle case where user is not found
						console.log(
							`User not found: ${fastestPlayer.username}`
						);
					}
				} catch (error) {
					console.error(
						`Failed to update points for ${fastestPlayer.username}:`,
						error
					);
				}

				reactionTimeArray.push(reactionTimeObject);

				const userId = reactionTimeObject.id;
				console.log("userId on existingRecord is: ", userId);

				if (!userId) {
					console.log("Not found any userId ", userId);
					return;
				}

				const userRoom = await getUserRoom(userId);
				console.log("Found userRoom : ", userRoom);

				if (!userRoom) {
					console.log(
						"Not found any userId nor found a roomName with the socket id",
						userRoom
					);
					return;
				}

				const userPoints = await getUserPoint(userRoom.roomName);
				console.log("Points for the user: ", userRoom, userPoints);

				const pointResultString = userPoints
					.map(
						(userPoint) =>
							`${userPoint.username} : ${userPoint.points}`
					)
					.join(", ");
				console.log("pointResultString: ", pointResultString);

				const pointResult = userPoints.map(
					(userPoint) => `${userPoint.username} : ${userPoint.points}`
				);
				// .join(', ');
				console.log("pointResult: ", pointResult);

				pointResult.forEach((result) => {
					const [username, pointsStr] = result.split(" : ");
					const points = parseInt(pointsStr); // Convert pointsStr to a number

					io.to(userRoom?.roomName).emit("updatePoints", {
						username,
						points,
					});
				});

				const pointResult2 = userPoints.reduce((acc, userPoint) => {
					acc[userPoint.username] = parseInt(
						String(userPoint.points)
					);
					return acc;
				}, {} as { [username: string]: number });

				console.log("pointResult2: ", pointResult2);

				//const dibwh sini, di dpn totalPoints
				totalPoints = Object.values(pointResult2).reduce(
					(acc, points) => {
						return acc + points;
					},
					0
				);

				console.log("Total Points: ", totalPoints);

				// Object.entries(playerScores).forEach(([username, points]) => {
				// 	// io.emit("updatePoints", { username, points });
				// 	 io.to(userRoom?.roomName).emit("updatePoints", { username, points });
				// });
				console.log("spelarnas poäng", pointResult); //playerScores before
				console.log("playerScores: ", playerScores);
				// Reset for the next round
				reactionTimeArray = [];

				// Broadcast the alltime/included this round fastest reaction time to all clients

				rounds++;

				console.log("Rounds= ", rounds);
				if (totalPoints === 6) {
					// if (rounds === 1) {
					io.emit("requestInnerText");

					// createGameResult(playerScores as Prisma.InputJsonValue);
					createGameResult(pointResult2 as Prisma.InputJsonValue); //AKU ganti disini tadi

					console.log("Game over, everybody wins!");

					//I did hide these codes, maybe find another way??
					// const user = await prisma.user_player.findUnique({
					// 	where: {
					// 		id: socket.id,
					// 	},
					// });

					// if (user) {
					// 	// First, delete all user_player records associated with the room
					// 	await prisma.user_player.deleteMany({
					// 		where: {
					// 			roomName: user.roomName,
					// 		},
					// 	});

					// 	// Then, delete the room
					// 	await prisma.room.delete({
					// 		where: {
					// 			name: user.roomName,
					// 		},
					// 	});
					// }

					async function createGameResult(
						scores: Prisma.InputJsonValue
					) {
						try {
							const gameResult = await prisma.gameResult.create({
								data: {
									scores,
								},
							});

							console.log("The game result: ", gameResult);

							const userRoom2 = await getUserRoom(socket.id);
							console.log("Found userRoom2 : ", userRoom2);

							console.log("playerCount: ", playerCount); //ga da result

							//This code seems doesnt work
							const players = await prisma.user_player.findMany({
								where: {
									id: {
										in: playerCount,
									},
									roomName: {
										equals: userRoom2?.roomName,
									},
								},
							});
							console.log("spelare i spelet", players);

							//Using this codes instead and it seem works
							const players2 = await prisma.user_player.findMany({
								where: {
									roomName: {
										equals: userRoom2?.roomName,
									},
								},
							});
							console.log(
								"spelare i spelet players2: ",
								players2
							);

							const playersData = {
								players: players2,
							};
							console.log(
								"this will send to client",
								playersData
							);

							// const userRoom = await getRoom();

							if (!userRoom2) {
								console.log(
									"Not found any socketId nor found a roomName with the socket id",
									socket.id
								);
								return;
							}

							// io.emit("gameOver", playersData);

							setTimeout(() => {
								io.to(userRoom2?.roomName).emit(
									"gameOver",
									playersData
								);
							}, 300);

							console.log("Game result: ", gameResult);
							console.log("skickas till frontend", playersData);

							playerCount = [];

							resetPlayerPoints(playerCount);
							deleteUsersByIds(playerCount);
						} catch (error) {
							console.error(
								"Failed to create game result:",
								error
							);
						}
						fetchAndEmitGameResults(io);
					}

					return;
				}
				reactionTimesByRoom[userRoom.roomName] = [];
				broadcastRandomEvent();
			}
		}
	);

	socket.on("sendInnerText", (data) => {
		console.log("Received data:", data);

		const { username, innerText } = data;
		saveReactionTimes(username, innerText, socket.id).catch((e) => {
			console.error("Error saving reaction time:", e);
		});

		async function saveReactionTimes(
			username: string,
			innerText: string,
			socketid: string
		) {
			await prisma.totaltime.create({
				data: {
					username: username,
					innerText: innerText,

					socketid: socketid,
					createdAt: new Date(),
				},
			});
		}
		emitFastestTotaltime(io);
	});

	socket.on("disconnect", async () => {
		playerCount = playerCount.filter(
			(playerSocketId) => playerSocketId !== socket.id
		);
		debug(
			`Player disconnected: ${socket.id}. Remaining players: ${playerCount.length}`
		);

		try {
			const userToDelete = await prisma.user_player.findUnique({
				where: {
					id: socket.id,
				},
			});

			if (userToDelete) {
				await prisma.user_player.delete({
					where: {
						id: userToDelete.id,
					},
				});
				console.log(`Successfully deleted user ${userToDelete.id}`);

				const usersInRoom = await prisma.user_player.findMany({
					where: {
						roomName: userToDelete.roomName,
					},
				});
				if (usersInRoom.length === 1) {
					io.to(userToDelete.roomName).emit(
						"UserDisconnect",
						userToDelete.username
					);
				}
				if (usersInRoom.length === 0) {
					await prisma.room.delete({
						where: {
							name: userToDelete.roomName,
						},
					});
				}
			} else {
				console.log("User not found for disconnection cleanup.");
			}
		} catch (error) {
			console.error("Failed to delete user:", error);
		}
	});

	async function broadcastRandomEvent() {
		const delay = Math.floor(Math.random() * (10000 - 1500 + 1)) + 1500;

		const randomNumber = Math.floor(Math.random() * 50) + 1;
		const elementId = "virusImg-" + randomNumber.toString();

		const UserRoomName = await prisma.user_player.findUnique({
			where: {
				id: socket.id,
			},
			select: { roomName: true },
		});
		console.log("Rummet användaren är i", UserRoomName);

		console.log("Rummet användaren är i", UserRoomName);

		if (UserRoomName?.roomName !== undefined) {
			io.to(UserRoomName.roomName).emit("randomEvent", {
				delay,
				elementId,
			});
		} else {
			console.error("Room name is undefined");
		}
	}

	async function fetchAndEmitGameResults(io: Server) {
		const gameResults = await prisma.gameResult.findMany({
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		const scoresArray: PlayerScores[] = gameResults.map((gameResult) => {
			const scores = gameResult.scores;

			if (
				typeof scores === "object" &&
				scores !== null &&
				!Array.isArray(scores)
			) {
				return scores as PlayerScores;
			}

			return {};
		});

		io.emit("GameResultMongo", scoresArray);
	}
};

function generateRoomName() {
	return Math.random().toString(36).substring(2, 8);
}

async function emitFastestTotaltime(io: Server) {
	try {
		const fastestUser = await fetchAndLogFastestUser();

		if (fastestUser) {
			io.emit("fastestTotalTime", {
				username: fastestUser.username,
				totaltime: fastestUser.innerText,
			} as FastestTotalTimeData);
		}
	} catch (error) {
		console.error("Error emitting the fastest total time:", error);
	}
}

async function fetchAndLogFastestUser() {
	try {
		const fastestUser = await prisma.totaltime.findFirst({
			orderBy: { innerText: "asc" },
		});
		console.log("Denna användare är snabbast", fastestUser);
		return fastestUser;
	} catch (error) {
		console.error("Error fetching the fastest user:", error);
		return null;
	}
}

interface PlayerScores {
	[username: string]: number;
}

let playerScores: PlayerScores = {};
function findAndAwardFastestPlayer(reactionTimeArray: ReactionTimeObject[]) {
	reactionTimeArray.forEach((player) => {
		if (playerScores[player.username] === undefined) {
			playerScores[player.username] = 0;
		}
	});

	const fastestPlayer = reactionTimeArray.reduce((fastest, player) => {
		if (!fastest) return player;
		const fastestTime = timeToMilliseconds(fastest.reactiontime);
		const playerTime = timeToMilliseconds(player.reactiontime);
		return playerTime < fastestTime ? player : fastest;
	});

	if (fastestPlayer) {
		if (playerScores[fastestPlayer.username] === undefined) {
			playerScores[fastestPlayer.username] = 0;
		}

		playerScores[fastestPlayer.username] += 1;

		return {
			...fastestPlayer,
			points: playerScores[fastestPlayer.username],
		};
	}
	return fastestPlayer;
}

async function resetPlayerPoints(playerCount: any) {
	try {
		const resetResult = await prisma.user_player.updateMany({
			where: {
				id: {
					in: playerCount,
				},
			},
			data: {
				points: 0,
			},
		});

		console.log(`Points reset for ${resetResult.count} players`);
	} catch (error) {
		console.error("Failed to reset player points:", error);
	}
}

async function deleteUsersByIds(playerCount: any) {
	try {
		const deleteResult = await prisma.user_player.deleteMany({
			where: {
				id: {
					in: playerCount,
				},
			},
		});

		return deleteResult.count;
	} catch (error) {
		return 0;
	}
}

function timeToMilliseconds(timestring: string): number {
	const parts = timestring.split(":");
	const minutes = parseInt(parts[0], 10);
	const seconds = parseInt(parts[1], 10);
	const milliseconds = parseInt(parts[2], 10);
	return (minutes * 60 + seconds) * 1000 + milliseconds;
}

interface ReactionTimeRecord {
	username: string;
	reactiontimes: number[];
}
async function broadcastFastestReactionTime(io: Server) {
	const reactionTimes =
		(await prisma.reaction_time.findMany()) as ReactionTimeRecord[];

	let fastestTime = Infinity;
	let fastestPlayer: ReactionTimeRecord | null = null;

	reactionTimes.forEach((player) => {
		player.reactiontimes.forEach((time) => {
			if (time < fastestTime) {
				fastestTime = time;
				fastestPlayer = player;
			}
		});
	});

	if (fastestPlayer) {
		io.emit(
			"fastestReactionTime",

			fastestTime.toString()
		);
	}
}
