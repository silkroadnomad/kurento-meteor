roomStream = new Meteor.Stream('rooms');


if(Meteor.isCordova){
    Meteor.startup(function () {
          if(window.device.platform === 'iOS') cordova.plugins.iosrtc.registerGlobals();
    });
}

if (Meteor.isClient) {

  Template.hello.events({
    'click #start': function () {
      console.log('starting webrtc');
     start();
    },
    'click #stop': function () {
      console.log('starting webrtc');
     stop();
    }
  });

var videoInput;
var videoOutput;
var webRtcPeer;
var state = null;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

window.onload = function() {
  // console = new Console();
  console.log('Page loaded ...');
  videoInput = document.getElementById('videoInput');
  videoOutput = document.getElementById('videoOutput');
  setState(I_CAN_START);


  roomStream.on('message', function(message) {

    var parsedMessage = JSON.parse(message);
    console.info('Received message: ' + parsedMessage.id);
    
    switch (parsedMessage.id) {
      case 'startResponse':
        startResponse(parsedMessage);
        break;
      case 'error':
        if (state == I_AM_STARTING) {
          setState(I_CAN_START);
        }
        onError('Error message from server: ' + parsedMessage.message);
        break;
      case 'iceCandidate':
        console.log('iceCandidate received... adding to webRTCPeer'+JSON.stringify(parsedMessage.candidate));
        webRtcPeer.addIceCandidate(parsedMessage.candidate)
        break;
      default:
        if (state == I_AM_STARTING) {
          setState(I_CAN_START);
        }
        onError('Unrecognized message', parsedMessage);
    }
  });
}

window.onbeforeunload = function() {
 // ws.close();
}



function start() {
  console.log('Starting video call ...')
  // Disable start button
  setState(I_AM_STARTING);
  showSpinner(videoInput, videoOutput);

  console.log('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
      localVideo: videoInput,
      remoteVideo: videoOutput,
      onicecandidate : onIceCandidate
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
        if(error) return onError(error);
        this.generateOffer(onOffer);
    });
}

function onIceCandidate(candidate) {

    console.log('Local candidate about to send from client' );//+ JSON.stringify(candidate));

     var message = {
        id : 'onIceCandidate',
        candidate : candidate
     };
     sendMessage(message);
}

function onOffer(error, offerSdp) {
  if(error) return onError(error);

  console.info('Invoking SDP offer callback function ' + location.host);
  var message = {
    id : 'start',
    sdpOffer : offerSdp
  }
  sendMessage(message);
}

function onError(error) {
  console.error(error);
}

function startResponse(message) {
  setState(I_CAN_STOP);
  console.log('SDP answer received from server. Processing ...');
  webRtcPeer.processAnswer(message.sdpAnswer);
}

function stop() {
  console.log('Stopping video call ...');
  setState(I_CAN_START);
  if (webRtcPeer) {
    webRtcPeer.dispose();
    webRtcPeer = null;

    var message = {
      id : 'stop'
    }
    sendMessage(message);
  }
  hideSpinner(videoInput, videoOutput);
}

function setState(nextState) {
  switch (nextState) {
  case I_CAN_START:
    $('#start').attr('disabled', false);
    // $('#start').attr('onclick', 'start()');
    $('#stop').attr('disabled', true);
    $('#stop').removeAttr('onclick');
    break;

  case I_CAN_STOP:
    $('#start').attr('disabled', true);
    $('#stop').attr('disabled', false);
    // $('#stop').attr('onclick', 'stop()');
    break;

  case I_AM_STARTING:
    $('#start').attr('disabled', true);
    // $('#start').removeAttr('onclick');
    $('#stop').attr('disabled', true);
    // $('#stop').removeAttr('onclick');
    break;

  default:
    onError('Unknown state ' + nextState);
    return;
  }
  state = nextState;
}

function sendMessage(message) {
  var jsonMessage = JSON.stringify(message);
  console.log('Sending message: ' + jsonMessage);
   roomStream.emit("message", jsonMessage);
}

function showSpinner() {
  for (var i = 0; i < arguments.length; i++) {
    arguments[i].poster = './img/transparent-1px.png';
    arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
  }
}

function hideSpinner() {
  for (var i = 0; i < arguments.length; i++) {
    arguments[i].src = '';
    arguments[i].poster = './img/webrtc.png';
    arguments[i].style.background = '';
  }
}


}


var ws_uri = "ws://localhost:8888/kurento";
if (Meteor.isServer) {
    //enter ip of kurento media server
    if(Meteor.settings.private && Meteor.settings.private.ws_uri) {
      ws_uri = Meteor.settings.private.ws_uri;
    }
    console.log('configuring kurento media server on url: '+ws_uri);

    // SSLProxy({
    //    port: 8443, //or 443 (normal port/requires sudo)
    //    ssl : {
    //         key: Assets.getText("key.pem"),
    //         cert: Assets.getText("cert.pem"),

    //         //Optional CA
    //         //Assets.getText("ca.pem")
    //    }
    // });


  var kurento = Meteor.npmRequire("kurento-client");
  var sessions = {};
  var candidatesQueue = {};
  var kurentoClient = null;
  
  roomStream.permissions.write(function(eventName) {
      return true;
  });

  roomStream.permissions.read(function(eventName) {
      return true;
  });

  Meteor.startup(function () {
    // code to run on server at startup
  });


  roomStream.on('error', function(error) {
      console.log('Connection ' + sessionId + ' error');
      stop(sessionId);
  });

  roomStream.on('close', function() {
      console.log('Connection ' + sessionId + ' closed');
      stop(sessionId);
  });

  roomStream.on('message', function(_message) {
      var sessionId = 'shoouldbearealsessionidfrommeteor.userId'; //e.g.this.userId
      var message = JSON.parse(_message);
      console.log('Connection ' + sessionId + ' received message ', message.id);

      switch (message.id) {
      case 'start':

          var sdpAnswer =  start(sessionId, message.sdpOffer); 
          console.log('got sdpAnswer... '+JSON.stringify(sdpAnswer));

          roomStream.emit("message", JSON.stringify({
              id : 'startResponse',
              sdpAnswer : sdpAnswer
          }));

          break;

      case 'stop':
          stop(sessionId);
          break;

      case 'onIceCandidate':
          onIceCandidate(sessionId, message.candidate);
          break;

      default:
          roomStream.emit("message", JSON.stringify({
              id : 'error',
              message : 'Invalid message ' + message
          }));
          break;
      }

  });


  function start(sessionId, sdpOffer) {
  
      var syncedClient = Meteor.wrapAsync(kurento);
      kurentoClient = syncedClient(ws_uri);

      var syncedPipeline = Meteor.wrapAsync(kurentoClient.create,kurentoClient);
      pipeline = syncedPipeline('MediaPipeline');

      var syncedwebRtc = Meteor.wrapAsync(pipeline.create,pipeline);
      var webRtcEndpoint = syncedwebRtc('WebRtcEndpoint');

      if (candidatesQueue[sessionId]) {
          while(candidatesQueue[sessionId].length) {
              var candidate = candidatesQueue[sessionId].shift();
              webRtcEndpoint.addIceCandidate(candidate);
          }
      }

      //connect endpoint with own endpoint
      var syncedConnect = Meteor.wrapAsync(webRtcEndpoint.connect,webRtcEndpoint);
      syncedConnect(webRtcEndpoint); 

      webRtcEndpoint.on('OnIceCandidate', function(event) {
          var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
          roomStream.emit("message", JSON.stringify({
              id : 'iceCandidate',
              candidate : candidate
          }));
      });

      var syncedOffer = Meteor.wrapAsync(webRtcEndpoint.processOffer,webRtcEndpoint);
      var sdpAnswer = syncedOffer(sdpOffer);

      sessions[sessionId] = {
          'pipeline' : pipeline,
          'webRtcEndpoint' : webRtcEndpoint
      }
                      

      var syncedGatherCandidates = Meteor.wrapAsync(webRtcEndpoint.gatherCandidates,webRtcEndpoint);
      syncedGatherCandidates();

      return sdpAnswer;
  }

  function stop(sessionId) {
      if (sessions[sessionId]) {
          var pipeline = sessions[sessionId].pipeline;
          console.info('Releasing pipeline');
          pipeline.release();

          delete sessions[sessionId];
          delete candidatesQueue[sessionId];
      }
  }

  function onIceCandidate(sessionId, _candidate) {
      var candidate = kurento.register.complexTypes.IceCandidate(_candidate);

      if (sessions[sessionId]) {
          console.info('Sending candidate');
          var webRtcEndpoint = sessions[sessionId].webRtcEndpoint;
          webRtcEndpoint.addIceCandidate(candidate);
      }
      else {
          console.info('Queueing candidate');
          if (!candidatesQueue[sessionId]) {
              candidatesQueue[sessionId] = [];
          }
          candidatesQueue[sessionId].push(candidate);
      }
  }

}
