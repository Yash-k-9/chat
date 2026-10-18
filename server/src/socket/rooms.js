// Room names in one place. A ROOM is a named group of socket connections:
// emitting to a room reaches every connection in it.
//   user:<id>  every open tab/device of one user
//   chat:<id>  every connection of every member of one chat
export const userRoom = (userId) => `user:${userId}`;
export const chatRoom = (chatId) => `chat:${chatId}`;
