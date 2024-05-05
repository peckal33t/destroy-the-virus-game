import prisma from "../prisma";

export const getRooms = () => {
	return prisma.room.findMany({
		orderBy: {
			name: "asc",
		},
		include: {
			users: true,
		},
	});
};

export const getRoom = (roomName: string) => {
	return prisma.room.findUnique({
		where: {
			name: roomName,
		},
		include: {
			users: true,
		},
	});
};

export async function getUserRoomName(
	socketId: string
): Promise<string | null> {
	const user = await prisma.user_player.findUnique({
		where: {
			id: socketId,
		},
		select: {
			roomName: true,
		},
	});
	// Return null if the room name is not found (user is null or user.roomName is undefined)
	return user?.roomName ?? null;
}
