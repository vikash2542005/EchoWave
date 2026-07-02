import { Server  } from 'socket.io';

let connections = {};
let messages = {};
let timeOnline = {};
let socketUsernames = {};

export const connectToSocket = (server)=>{
    const io = new Server(server,{
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on('connection', (socket)=>{
        console.log("something connected");

        socket.on('join-call',(path, username = '')=>{
            if(connections[path] === undefined){
                connections[path] = [];
            }
            socketUsernames[socket.id] = username || `User-${socket.id.slice(0, 4)}`;
            connections[path].push(socket.id);
            timeOnline[socket.id] = Date.now();

            for(let a=0; a<connections[path].length-1; a++){
                io.to(connections[path][a]).emit('user-joined', {
                    socketId: socket.id,
                    username: socketUsernames[socket.id],
                });
            }

            if (messages[path] !== undefined){
                for(let a=0; a<messages[path].length; a++){
                    io.to(socket.id).emit('chat-message', messages[path][a]['data'], 
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender']);
                }
            }
            
        });

        socket.on('signal',(toId, message)=>{
            io.to(toId).emit('signal', socket.id, message, socketUsernames[socket.id]);
        });

        socket.on('chat-message', (data, sender)=>{
            const [matchingRoom, found] = Object.entries(connections).reduce(([room, found], [roomKey, roomValue]) => {
                    if (!found && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, found];
                }, ['', false]);

                if(found){
                    if(messages[matchingRoom] === undefined){
                        messages[matchingRoom] = [];
                    }
                }
                messages[matchingRoom].push({'data': data, 'sender': sender, 'socket-id-sender': socket.id});
                console.log("message: ", data, " sender: ", sender, " socket-id-sender: ", socket.id);

                for(let a=0; a<connections[matchingRoom].length; a++){
                    io.to(connections[matchingRoom][a]).emit('chat-message', data, sender, socket.id);
                }
            
        });

        socket.on('disconnect', () => {
            let diffTime = Math.abs(timeOnline[socket.id] - Date.now());
            console.log('User disconnected: ', socket.id, ' time online: ', diffTime/1000, ' seconds');

            // Find and remove socket from its room
            for (const [path, socketIds] of Object.entries(connections)) {
                const index = socketIds.indexOf(socket.id);
                if (index !== -1) {
                    socketIds.splice(index, 1);
                    // Notify remaining users
                    socketIds.forEach(remainingId => {
                        io.to(remainingId).emit('user-left', socket.id);
                    });
                    // Cleanup empty room
                    if (socketIds.length === 0) {
                        delete connections[path];
                        delete messages[path]; // Optional: clear messages too
                    }
                    break;
                }
            }

            delete socketUsernames[socket.id];
            delete timeOnline[socket.id];
        });

    });



    return io;
}