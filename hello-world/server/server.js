

var ws_uri = "ws://localhost:8888/kurento";
if (Meteor.isServer) {
    //enter ip of kurento media server
    if(Meteor.settings.private && Meteor.settings.private.ws_uri) {
      ws_uri = Meteor.settings.private.ws_uri;
    }
    console.log('configuring kurento media server on url: '+ws_uri);

  var kurento = require('kurento-client');
  // var kurento = Meteor.npmRequire("kurento-client");
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
