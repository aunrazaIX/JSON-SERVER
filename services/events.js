const socketController = (socket, io) => {
    socket.on('join', (payload) => {
        let { shipmentId } = payload || {}
        let roomName = "room-" + shipmentId
        console.log(`Joining room :: ${roomName}`)
        socket.join(roomName);
    });
    socket.on('location', (payload) => {
        console.log(`Received location update from ${socket.id}`);
        let roomName = "room-" + payload.shipmentId
        io.to(roomName).emit('location', JSON.stringify({
            id: socket.id,
            shipmentId: payload.shipmentId,
            location: payload.location,
        }));

    });
}

module.exports = socketController
