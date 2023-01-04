import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

export const io = new Server({ cors: { origin: "*" } });

const serverRooms: Map<string, string> = new Map();

io.on("connection", (socket) => {
  socket.on("play", () => {
    const rooms = Array.from(io.sockets.adapter.rooms).filter(
      ([roomId, members]) => members.size === 1 && roomId.startsWith("room:")
    );

    if (rooms.length === 0) {
      const roomId = "room:" + uuid();

      socket.join(roomId);
      socket.emit("created_room", roomId);
      serverRooms.set(socket.id, roomId);

      return;
    }

    const [roomId] = rooms[0];
    socket.join(roomId);
    serverRooms.set(socket.id, roomId);

    const members = Array.from(io.sockets.adapter.rooms.get(roomId) as Set<string>)
      .sort()
      .map((member, index) => ({ id: member, isWhite: index === 0 }));

    io.to(roomId).emit("joined_room_start_game", { roomId, members });
  });

  socket.on("move", (data: any) => {
    const roomId = serverRooms.get(socket.id);
    if (!roomId) return;

    io.to(roomId).emit("move", data);
  });

  socket.on("share_profile", (data: any) => {
    const roomId = serverRooms.get(socket.id);
    if (!roomId) return;

    io.to(roomId).emit("share_profile", { id: socket.id, data });
  });

  socket.on("gameover", () => {
    const roomId = serverRooms.get(socket.id);
    if (!roomId) return;

    io.sockets.adapter.rooms.delete(roomId);
    serverRooms.delete(roomId);
  });
});

io.listen(3000);
