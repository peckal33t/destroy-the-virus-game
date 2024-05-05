import prisma from "../prisma";
// import { ReactionTime } from "@shared/types/SocketTypes";

export const getReactionTime = (userId: string) => {

	return prisma.reaction_time.findFirst({
		where: {
			id: userId,
		},
		select: {
			reactiontimes: true,
		},
	});
}
