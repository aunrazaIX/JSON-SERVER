const socketController = require("./events");
const connectSocket = async (io) => {
    try {
        io.on('connection', (socket) => {
            console.log("Socket Connection Successfully Created")
            socketController(socket, io)
            socket.on('disconnect', () => {
                console.log('Socket Connection Successfully Disconnected',)
            });
        })
    } catch (e) {
        console.log("Error while connecting to Sockets", e)
    }
}
module.exports = {
    connectSocket
}