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
        onicecandidate : onIceCandidate,
                    iceServers: [
                          {urls: 'stun:173.194.71.127:19302'},
                          {urls: 'turn:5.9.154.226:3478?transport=tcp', username:'akashionata', credential: 'silkroad2015'}
                        ]
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
          onicecandidate : onIceCandidate,
                      iceServers: [
                          {urls: 'stun:173.194.71.127:19302'},
                          {urls: 'turn:5.9.154.226:3478?transport=tcp', username:'akashionata', credential: 'silkroad2015'}
                        ]
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
