var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var port = process.env.PORT || 3001;
var roomName;
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use("/js", express.static(`${__dirname}/js/`)); 

io.on('connection', function(socket){

  socket.on("connect-client", function(msg){
    io.to(socket.client.id).emit("connect-client", socket.client.id);
  });

  socket.on('chat_message', function(msg){
    io.emit('chat_message', msg);
  });

  socket.on("vc-data", function(msg){
    socket.broadcast.emit("vc_data_srv", msg);
  });

  socket.on("create or join", function(room){
    var roomDetails={};
    roomName = room;
    var clients = io.sockets.adapter.rooms[room];
    roomDetails.room = roomName;
    roomDetails.clients = clients;
    var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;
    if(numClients ==0){
      socket.join(room);
      io.emit("created", roomDetails);
      socket.broadcast.emit('created-room', "new member created room");
    } else if (numClients > 1){
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      roomDetails.guestID = socket.client.id;
      io.emit('joined', roomDetails);
      socket.broadcast.emit('created-room', roomDetails);
    }


    io.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);
  });

  socket.on('data', function(datas){
    console.log("data"+datas);
  });
  
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
