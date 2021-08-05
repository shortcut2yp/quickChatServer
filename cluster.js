import cluster from "cluster"
import http from "http"
import process from "process"
import { setupMaster } from "@socket.io/sticky"
import { start } from "./index.js"

const WORKERS_COUNT = 4
if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)
  for (let i = 0; i < WORKERS_COUNT.length; i++) {
    cluster.fork()
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} is dead !`)
    cluster.fork()
  })

  const httpServer = http.createServer()
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection", //random , round-robin
  })

  const PORT = process.env.PORT || 4000
  httpServer.listen(4000, () => {
    console.log(`Server listening at port ${PORT}`)
  })
} else {
  console.log(`Worker ${process.pid} started !`)
  start()
}
