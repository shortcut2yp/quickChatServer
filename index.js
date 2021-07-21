import { createServer } from "http"
import { Server } from "socket.io"
import { v4 as uuidv4 } from "uuid"
import {
  saveSession,
  findSession,
  findAllSessions,
} from "./src/sessionStorage.js"

const httpServer = createServer()
const clientUrl = "http://localhost:3000"

const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
  },
})

io.use((socket, next) => {
  const sessionId = socket.handshake.auth.sessionId
  if (sessionId) {
    const session = findSession(sessionId)
    if (session) {
      socket.sessionId = sessionId
      socket.userId = session.userId
      socket.username = session.username
      return next()
    } else {
      return next(new Error("Invalid session"))
    }
  }

  const username = socket.handshake.auth.username
  if (!username) {
    return next(new Error("Invalid username"))
  }

  socket.username = username
  socket.userId = uuidv4()
  socket.sessionId = uuidv4()
  next()
})

io.on("connection", async (socket) => {
  saveSession(socket.sessionId, {
    userId: socket.userId,
    username: socket.username,
    connected: true,
  })

  socket.join(socket.userId)

  //get all connected users
  const users = []

  findAllSessions().forEach((session) => {
    if (session.userId !== socket.userId) {
      users.push({
        userId: session.userId,
        username: session.username,
        connected: session.connected,
      })
    }
  })

  //all users event
  socket.emit("users", users)

  //connected user details event
  socket.emit("session", {
    sessionId: socket.sessionId,
    userId: socket.userId,
    username: socket.username,
  })

  //new user event
  socket.broadcast.emit("user connected", {
    userId: socket.userId,
    username: socket.username,
  })

  //new message event
  socket.on("new message", (message) => {
    socket.broadcast.emit("new message", {
      userId: socket.userId,
      username: socket.username,
      message,
    })
  })

  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userId).allSockets()
    const isDisconnected = matchingSockets.size === 0
    if (isDisconnected) {
      socket.broadcast.emit("user disconnected", {
        userId: socket.userId,
        username: socket.username,
      })
      saveSession(socket.sessionId, {
        userId: socket.userId,
        username: socket.username,
        connected: socket.connected,
      })
    }
  })
})

console.log("Listening to port...")
httpServer.listen(process.env.PORT || 4000)
