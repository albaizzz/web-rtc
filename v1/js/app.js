var socket = io();
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");
var localStream;
var room;
let pc;
var roomInfo ={};
var clientID;

const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};

$(function () {
    
  if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }
  room= location.hash.substring(1);

  socket.emit("connect-client");

  if (room  != ""){
      socket.emit("create or join", room);
  }


  socket.on('connect-client', function(clientID) {
    this.clientID = clientID;
    console.log("cc");
    console.log(this.clientID);

  });

  socket.on('chat_message', function(msg){
    $('#messages').append($('<li>').text(msg));
    window.scrollTo(0, document.body.scrollHeight);
  });

  
  socket.on("vc_data_srv", function(message){
      console.log(message);
      console.log(this.clientID);
      if(this.clientID == message.roomInfo.guestID){
        console.log("return");
        return;
      }

      // console.log(message);
      if (message.sdp) {
        // This is called after receiving an offer or answer from another peer
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
          // When receiving an offer lets answer it
          if (pc.remoteDescription.type === 'offer') {
            pc.createAnswer().then(localDescCreated).catch(onError);
          }
        }, onError);
      } else if (message.candidate) {
        // Add the new ICE candidate to our connections remote description
        pc.addIceCandidate(
          new RTCIceCandidate(message.candidate), onSuccess, onError
        );
      }
  });

  socket.on("created", function(msg){
    roomInfo = msg;
    var numClients = (typeof msg.clients !== 'undefined') ? Object.keys(msg.clients).length : 0;
    startWebRTC(numClients > 1);
  });


  socket.on("joined", function(msg){
    roomInfo = msg;
    var numClients = (typeof msg.clients !== 'undefined') ? Object.keys(msg.clients).length : 0;
    startWebRTC(numClients > 1);
  });
  
  socket.on("created-room", function(msg){
      roomInfo = msg;
      var numClients = (typeof msg.clients !== 'undefined') ? Object.keys(msg.clients).length : 0;
      startWebRTC(numClients > 1);
    });
  });


  $('form').submit(function(){
    socket.emit('chat_message', $('#m').val());
    $('#m').val('');
    return false;
  });

function gotStream(stream) {
  trace('Received local stream');
  localVideo.srcObject = stream;
  localStream = stream;
}


// logging utility
function trace(arg) {
  var now = (window.performance.now() / 1000).toFixed(3);
  console.log(now + ': ', arg);
}

function startWebRTC(isOfferer){
    pc = new RTCPeerConnection(configuration);
  
    // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
    // message to the other peer through the signaling server
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({'candidate': event.candidate});
      }
    };
  
    // If user is offerer let the 'negotiationneeded' event create the offer
    if (isOfferer) {
      pc.onnegotiationneeded = () => {
        pc.createOffer().then(localDescCreated).catch(onError);
      }
    }


    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    }).then(stream => {
      // Display your local video in #localVideo element
      localVideo.srcObject = stream;
      // Add your stream to be sent to the conneting peer
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }, onError);
  
    // When a remote stream arrives display it in the #remoteVideo element
    pc.ontrack = event => {
      const stream = event.streams[0];
      if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
        remoteVideo.srcObject = stream;
      }
    };
    
}


function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}


// Send signaling data via Scaledrone
function sendMessage(message) {
  message.roomInfo = roomInfo;
  socket.emit("vc-data", message);
}


function onSuccess() {};
function onError(error) {
  console.error(error);
  // console.log(error);
};

