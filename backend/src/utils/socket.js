const { Server } = require("socket.io");
const { logger } = require("../config/logger");

let io;

module.exports = {
  init: (httpServer) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://localhost:5000",
      "https://indocreo.multimarg.com",
      "https://multimarg.com"
    ];
    if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
      }
    });

    io.on("connection", (socket) => {
      logger.info(`New socket client connected: ${socket.id}`);
      
      socket.on("disconnect", () => {
        logger.info(`Socket client disconnected: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      return null;
    }
    return io;
  },
  // Helper function to emit a data update event
  emitDataUpdated: (moduleName, action = "update") => {
    if (io) {
      io.emit("data_updated", { module: moduleName, action, timestamp: new Date().toISOString() });
      logger.info(`Socket event emitted: data_updated for ${moduleName}`);
    }
  }
};
