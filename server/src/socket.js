// Socket.io singleton — import this in controllers to emit events.
// The Server instance is initialised by index.js and stored here.

let _io = null;

export function setIO(io) {
    _io = io;
}

export function getIO() {
    return _io;
}
