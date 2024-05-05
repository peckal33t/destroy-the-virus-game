import { Socket } from "socket.io";
import prisma from "../prisma";

export const getPlayersInRoom = (roomName: string) => {
	return prisma.user_player.findMany({
		where: {
			roomName,
		},
		orderBy: {
			username: "asc",
		},
	});
};

export const getUserRoom = (socketId: string) => {
	return prisma.user_player.findFirst({
						where: {
							 id: socketId
							 },
							 select: {
								roomName : true,
							 },

					});
}

export const getUserPoint = (roomName: string) => {
	return prisma.user_player.findMany({
						where: {
							 roomName: roomName
							 },
							 select: {
								username: true,
								points : true,
							 },

					});
}

export const getUsername = (userId: string) => {
	return prisma.user_player.findFirst({
						where: {
							 id: userId
							 },
							 select: {
								username: true,
							 },
					});
}
