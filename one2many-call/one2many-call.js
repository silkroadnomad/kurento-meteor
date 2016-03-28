roomStream = new Meteor.Stream('rooms');

if(Meteor.isCordova){
    Meteor.startup(function () {
          if(window.device.platform === 'iOS') cordova.plugins.iosrtc.registerGlobals();
    });
}

if (Meteor.isClient) {
 
  var video;
  var webRtcPeer;
    
  Template.hello.rendered = function() {

    console.log('Page loaded ...');
    video = document.getElementById('video');

    roomStream.on('serverMessage', function(message) {

      var parsedMessage = JSON.parse(message);
      console.info('Received message: ' + parsedMessage.id);
      
      switch (parsedMessage.id) {
      case 'presenterResponse':
        presenterResponse(parsedMessage);
        break;
      case 'viewerResponse':
        viewerResponse(parsedMessage);
        break;
      case 'stopCommunication':
        dispose();
        break;
      case 'iceCandidate':
        webRtcPeer.addIceCandidate(parsedMessage.candidate)
        break;
      default:
        console.error('Unrecognized message', parsedMessage);
      }
    });
  }

  Template.hello.events({
    'click #call': function () {
      console.log('starting webrtc');
        presenter(); 
    },
    'click #viewer': function () {
      console.log('starting webrtc');
        viewer();
    },
    'click #terminate': function () {
      console.log('starting webrtc');
        stop();
    },
  });

  function presenterResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      console.warn('Call not accepted for the following reason: ' + errorMsg);
      dispose();
    } else {
      webRtcPeer.processAnswer(message.sdpAnswer);
    }
  }

  function viewerResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      console.warn('Call not accepted for the following reason: ' + errorMsg);
      dispose();
    } else {
      webRtcPeer.processAnswer(message.sdpAnswer);
    }
  }

  function presenter() {
    if (!webRtcPeer) {
      showSpinner(video);

      var options = {
        localVideo: video,
        onicecandidate : onIceCandidate
        }

      webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
        if(error) return onError(error);

        this.generateOffer(onOfferPresenter);
      });
    }
  }

  function onOfferPresenter(error, offerSdp) {
      if (error) return onError(error);

    var message = {
      id : 'presenter',
      sdpOffer : offerSdp
    };
    sendMessage(message);
  }

  function viewer() {
    if (!webRtcPeer) {
        showSpinner(video);

        var options = {
          remoteVideo: video,
          onicecandidate : onIceCandidate
        }

        webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
          if(error) return onError(error);

          this.generateOffer(onOfferViewer);
        });
    }
  }

  function onOfferViewer(error, offerSdp) {
    if (error) return onError(error)

    var message = {
      id : 'viewer',
      sdpOffer : offerSdp
    }
    sendMessage(message);
  }

  function onIceCandidate(candidate) {
      // console.log('Local candidate' + JSON.stringify(candidate));

       var message = {
          id : 'onIceCandidate',
          candidate : candidate
       }
       sendMessage(message);
  }

  function stop() {
    if (webRtcPeer) {
      var message = {
          id : 'stop'
      }
      sendMessage(message);
      dispose();
    }
  }

  function dispose() {
    if (webRtcPeer) {
      webRtcPeer.dispose();
      webRtcPeer = null;
    }
    hideSpinner(video);
  }

  function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
   // console.log('Sending message: ' + jsonMessage);
     roomStream.emit("clientMessage", jsonMessage);
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
      
  candidatesQueue = {};
  presenter = null;
  viewers = [];
  var sessionId = null;
  
  var noPresenterMessage = 'No active presenter. Try again later...';
  
  roomStream.permissions.write(function(eventName) {
      return true;
  });

  roomStream.permissions.read(function(eventName) {
    console.log('eventName:'+eventName+' ');
      sessionId = this.subscriptionId ;//nextUniqueId();
      return true;
  });

  roomStream.on('error', function(error) {
      console.log('Connection ' + sessionId + ' error');
      stop(sessionId);
  });

  roomStream.on('close', function() {
      console.log('Connection ' + sessionId + ' closed');
      stop(sessionId);
  });

  roomStream.on('clientMessage', function(_message) {
      
      var message = JSON.parse(_message);
      console.log('Connection ' + sessionId + ' received message ', message);

      switch (message.id) {
        case 'presenter':

          var sdpAnswer = startPresenter(sessionId, message.sdpOffer); 
            
          if (sdpAnswer.lastIndexOf('Error: ', 0) === 0) {
            return roomStream.emit("serverMessage", JSON.stringify({
              id : 'presenterResponse',
              response : 'rejected',
              message : sdpAnswer
            }));
          }
            
          roomStream.emit("serverMessage", JSON.stringify({
            id : 'presenterResponse',
            response : 'accepted',
            sdpAnswer : sdpAnswer
          }));
        
        break;

        case 'viewer':
          
          var sdpAnswer =  startViewer(sessionId, message.sdpOffer);

          if (sdpAnswer.lastIndexOf('Error: ', 0) === 0) {
            return roomStream.emit("serverMessage", JSON.stringify({
              id : 'viewerResponse',
              response : 'rejected',
              message : error
            }));
          }
          
          roomStream.emit("serverMessage",JSON.stringify({
                id : 'viewerResponse',
                response : 'accepted',
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
            roomStream.emit("serverMessage",JSON.stringify({
                id : 'error',
                message : 'Invalid message ' + message
            }));
            break;
        }
    });

  function startPresenter(sessionId, sdpOffer) {
    clearCandidatesQueue(sessionId);

    if (presenter !== null) {
      stop(sessionId);
      return "Error: Another user is currently acting as presenter. Try again later ...";
    }

    presenter = {
      id : sessionId,
      pipeline : null,
      webRtcEndpoint : null
    }

    if (presenter === null) {
      stop(sessionId);
      return "Error: noPresenterMessage";
    }
    var syncedClient = Meteor.wrapAsync(kurento);
    kurentoClient = syncedClient(ws_uri);

    var syncedPipeline = Meteor.wrapAsync(kurentoClient.create,kurentoClient);
    pipeline = syncedPipeline('MediaPipeline');

    presenter.pipeline = pipeline;
    var syncedwebRtc = Meteor.wrapAsync(pipeline.create,pipeline);
    var webRtcEndpoint = syncedwebRtc('WebRtcEndpoint');

    presenter.webRtcEndpoint = webRtcEndpoint;

    if (candidatesQueue[sessionId]) {
        while(candidatesQueue[sessionId].length) {
            var candidate = candidatesQueue[sessionId].shift();
            webRtcEndpoint.addIceCandidate(candidate);
        }
    }

    webRtcEndpoint.on('OnIceCandidate', function(event) {
        var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
        roomStream.emit("serverMessage",JSON.stringify({
            id : 'iceCandidate',
            candidate : candidate
        }));
    });

    var syncedOffer = Meteor.wrapAsync(webRtcEndpoint.processOffer,webRtcEndpoint);
    var sdpAnswer = syncedOffer(sdpOffer);

    var syncedGatherCandidates = Meteor.wrapAsync(webRtcEndpoint.gatherCandidates,webRtcEndpoint);
    syncedGatherCandidates();
    
    return sdpAnswer;    
  }

  function startViewer(sessionId, sdpOffer) {
    clearCandidatesQueue(sessionId);

    //if presenter is a global variable - then only one presenter is allowed 
    //if you want Many2Many calls you should collect presenters per room
    //same for viewer array! 
    var syncedwebRtc = Meteor.wrapAsync(presenter.pipeline.create,presenter.pipeline);
    var webRtcEndpoint = syncedwebRtc('WebRtcEndpoint');

    viewers[sessionId] = {
      "webRtcEndpoint" : webRtcEndpoint
    }

    if (candidatesQueue[sessionId]) {
      while(candidatesQueue[sessionId].length) {
        var candidate = candidatesQueue[sessionId].shift();
        webRtcEndpoint.addIceCandidate(candidate);
      }
    }

    webRtcEndpoint.on('OnIceCandidate', function(event) {
        var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
        roomStream.emit("serverMessage",JSON.stringify({
            id : 'iceCandidate',
            candidate : candidate
        }));
    });


    var syncedOffer = Meteor.wrapAsync(webRtcEndpoint.processOffer,webRtcEndpoint);
    var sdpAnswer = syncedOffer(sdpOffer);

    var syncedConnect = Meteor.wrapAsync(presenter.webRtcEndpoint.connect,presenter.webRtcEndpoint);
    var connectNow = syncedConnect(webRtcEndpoint); 

    var syncedGatherCandidates = Meteor.wrapAsync(webRtcEndpoint.gatherCandidates,webRtcEndpoint);
    syncedGatherCandidates();

    return sdpAnswer; 
  }

  function clearCandidatesQueue(sessionId) {
    if (candidatesQueue[sessionId]) {
      delete candidatesQueue[sessionId];
    }
  }

  function stop(sessionId) {
    if (presenter !== null && presenter.id == sessionId) {
      for (var i in viewers) {
        var viewer = viewers[i];
        if (viewer.ws) {
          viewer.ws.send(JSON.stringify({
            id : 'stopCommunication'
          }));
        }
      }
      presenter.pipeline.release();
      presenter = null;
      viewers = [];

    } else if (viewers[sessionId]) {
      viewers[sessionId].webRtcEndpoint.release();
      delete viewers[sessionId];
    }

    clearCandidatesQueue(sessionId);
  }

  function onIceCandidate(sessionId, _candidate) {
      var candidate = kurento.register.complexTypes.IceCandidate(_candidate);
      console.log('onIceCanditate sessionId:'+sessionId);
      if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
          console.info('Sending presenter candidate');
          presenter.webRtcEndpoint.addIceCandidate(candidate);
      }
      else if (viewers[sessionId] && viewers[sessionId].webRtcEndpoint) {
          console.info('Sending viewer candidate');
          viewers[sessionId].webRtcEndpoint.addIceCandidate(candidate);
      }
      else {
         
          if (!candidatesQueue[sessionId]) {
              candidatesQueue[sessionId] = [];
          }
          candidatesQueue[sessionId].push(candidate);
      }
  }

}
