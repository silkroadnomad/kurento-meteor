
function checkPermissions(){
  //https://github.com/dpa99c/cordova-diagnostic-plugin/#android-runtime-permissions
  cordova.plugins.diagnostic.isMicrophoneAuthorized(function(authorized){
      console.log("App is " + (authorized ? "authorized" : "denied") + " access to the microphone");

      if(!authorized) {
         cordova.plugins.diagnostic.requestMicrophoneAuthorization(function(granted){
          console.log("Microphone access is: "+(granted ? "granted" : "denied"));
          }, function(error){
              console.error("The following error occurred: "+error);
          });      
      }
  }, function(error){
      console.error("The following error occurred: "+error);
  });

    cordova.plugins.diagnostic.isCameraAuthorized(function(authorized){
      
        console.log("App is " + (authorized ? "authorized" : "denied") + " access to the camera");

        if(!authorized) {
            cordova.plugins.diagnostic.requestCameraAuthorization(function(granted){
                console.log("Authorization request for camera use was " + (granted ? "granted" : "denied"));
            }, function(error){
                console.error(error);
            });
        }

    }, function(error){
        console.error("The following error occurred: "+error);
    });

}

if(Meteor.isCordova){
    Meteor.startup(function () {
          if(window.device.platform === 'iOS') cordova.plugins.iosrtc.registerGlobals();
          checkPermissions();
    });
}

if (Meteor.isClient) {

// require('webrtc-adapter');
  // require('getusermedia');
  var kurentoUtils = require('kurento-utils');

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

  Template.hello.rendered = function() {
  // console = new Console();
    // require('webrtc-adapter');
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
    
      if(Meteor.settings.public && Meteor.settings.public.iceServers) {
        options.iceServers = Meteor.settings.public.iceServers;
        console.log('iceServers from settings.json:'+options.iceServers);
      }

    console.log(options);
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