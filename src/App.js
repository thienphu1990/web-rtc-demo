import React, {useEffect} from 'react';
import styled from 'styled-components'
import adapter from 'webrtc-adapter';

const Bound = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  .video-container{
    display:flex;
    position: relative;
    width:70%;
    #local-video{
      /* max-width: 100%; */
      width: 100%;
      z-index:1;
    }
    #remote-video{
      position: absolute;
      bottom: 0;
      right: 0;
      /* max-width: 20%; */
      width: 30%;
      z-index: 0;
    }
  }
  .button-container{
    display: flex;
    flex-direction: row;
    width:100%;
    height: 50px;
    margin: 20px 0;
    justify-content:center;
    #start, #call, #hangup{
      width: 150px;
      height:50px;
      border-radius: 5px;
      background-color: #33ADFF;
      font-weight:bold;
      font-size: 15px;
      color: #fff;
      display:flex;
      align-items:center;
      justify-content:center;
      margin: 0 10px;
      :disabled{
        background-color: #cccccc;
      }
    }
  }
  
`
const mediaStreamConstraints = {
  video: {
    width: {
      min: 640,
      max: 1280
    },
    height: {
      min: 480,
      max: 720
    }
  },
  audio: true
}

const offerOptions = {
  offerToReceiveVideo: 1,
}

let localVideo;
let remoteVideo;

let callButton;
let startButton;
let hangupButton;

let startTime = null;

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

const App = () => {

  useEffect(() => {
    localVideo = document.getElementById('local-video')
    remoteVideo = document.getElementById('remote-video')
    startButton = document.getElementById('start')
    callButton = document.getElementById('call')
    hangupButton = document.getElementById('hangup');

    callButton.disabled = true
    hangupButton.disabled = true

    localVideo.addEventListener('loadedmetadata', logVideoLoaded)
    remoteVideo.addEventListener('loadedmetadata', logVideoLoaded)
    remoteVideo.addEventListener('onresize', logResizedVideo)

    return () => {
      localVideo.removeEventListener('loadedmetadata', logVideoLoaded)
      remoteVideo.removeEventListener('loadedmetadata', logVideoLoaded)
      remoteVideo.removeEventListener('onresize', logResizedVideo)
    }
  }, [])
  
  const gotLocalMediaStream = (mediaStream) => {
    if(!localVideo) return
    localVideo.srcObject = mediaStream
    localStream = mediaStream
    trace('Received local stream.')
    callButton.disabled = false
  }

  const handleLocalMediaStreamError = (error) => {
    trace(`navigator.getUserMedia error: ${error.toString()}.`)
  }
  
  const gotRemoteMediaStream = (event) => {
    const mediaStream = event.stream
    remoteVideo.style.zIndex = 2
    remoteVideo.srcObject = mediaStream
    remoteStream = mediaStream
    trace('Remote peer connection received remote stream.')
  }

  const logVideoLoaded = (event) => {
    const video = event.target
    trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
          `videoHeight: ${video.videoHeight}px.`)
  }

  const logResizedVideo = (event) => {
    logVideoLoaded(event)
    if (startTime) {
      const elapsedTime = window.performance.now() - startTime
      startTime = null
      trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`)
    }
  }

// Define RTC peer connection behavior.

  // Connects with new peer candidate.
  const handleConnection = (event) => {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
      const newIceCandidate = new RTCIceCandidate(iceCandidate);
      const otherPeer = getOtherPeer(peerConnection);

      otherPeer.addIceCandidate(newIceCandidate)
        .then(() => {
          handleConnectionSuccess(peerConnection);
        }).catch((error) => {
          handleConnectionFailure(peerConnection, error);
        });

      trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
  }

  // Logs that the connection succeeded.
  const handleConnectionSuccess = (peerConnection) => {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
  };

  // Logs that the connection failed.
  const handleConnectionFailure = (peerConnection, error) => {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
          `${error.toString()}.`);
  }

  // Logs changes to the connection state.
  const handleConnectionChange = (event) => {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`${getPeerName(peerConnection)} ICE state: ` +
          `${peerConnection.iceConnectionState}.`);
  }

  // Logs error when setting session description fails.
  const setSessionDescriptionError = (error) => {
    trace(`Failed to create session description: ${error.toString()}.`);
  }

  // Logs success when setting session description.
  const setDescriptionSuccess = (peerConnection, functionName) => {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
  }

  // Logs success when localDescription is set.
  const setLocalDescriptionSuccess = (peerConnection) => {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
  }

  // Logs success when remoteDescription is set.
  const setRemoteDescriptionSuccess = (peerConnection) => {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
  }

  // Logs offer creation and sets peer connection session descriptions.
  const createdOffer = (description) => {
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
      .then(() => {
        setLocalDescriptionSuccess(localPeerConnection);
      }).catch(setSessionDescriptionError);

    trace('remotePeerConnection setRemoteDescription start.');
    remotePeerConnection.setRemoteDescription(description)
      .then(() => {
        setRemoteDescriptionSuccess(remotePeerConnection);
      }).catch(setSessionDescriptionError);

    trace('remotePeerConnection createAnswer start.');
    remotePeerConnection.createAnswer()
      .then(createdAnswer)
      .catch(setSessionDescriptionError);
  }

  // Logs answer to offer creation and sets peer connection session descriptions.
  const createdAnswer = (description) => {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('remotePeerConnection setLocalDescription start.');
    remotePeerConnection.setLocalDescription(description)
      .then(() => {
        setLocalDescriptionSuccess(remotePeerConnection);
      }).catch(setSessionDescriptionError);

    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description)
      .then(() => {
        setRemoteDescriptionSuccess(localPeerConnection);
      }).catch(setSessionDescriptionError);
  }
  
// Define and add behavior to buttons.

  // Handles start button action: creates local MediaStream.
  const startAction = () => {
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    trace('Requesting local stream.');
  }

  // Handles call button action: creates peer connection.
  const callAction = () => {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // Get local media stream tracks.
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
      trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
      trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    const servers = {host: 'https://web.wee.vn/v1'};  // Allows for RTC server configuration.

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener(
      'iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace('Created remote peer connection object remotePeerConnection.');

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener(
      'iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    localPeerConnection.addStream(localStream);
    trace('Added local stream to localPeerConnection.');

    trace('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
      .then(createdOffer).catch(setSessionDescriptionError);
  }

  // Handles hangup action: ends up call, closes connections and resets peers.
  const hangupAction = () => {
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    remoteVideo.style.zIndex = 0;
    trace('Ending call.');
  }

// Define helper functions.

  // Gets the "other" peer connection.
  const getOtherPeer = (peerConnection) => {
    return (peerConnection === localPeerConnection) ?
        remotePeerConnection : localPeerConnection;
  }

  // Gets the name of a certain peer connection.
  const getPeerName = (peerConnection) => {
    return (peerConnection === localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
  }

  const trace = (text) => {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
  }
  
  return (
    <Bound>
      <div className='button-container'>
        <button id="start" onClick={()=>startAction()}>Start</button>
        <button id="call" onClick={()=>callAction()}>Call</button>
        <button id="hangup" onClick={()=>hangupAction()}>Hang Up</button>
      </div>
      <div className='video-container'>
        <video id="local-video" autoPlay></video>
        <video id="remote-video" autoPlay></video>
      </div>
    </Bound>
  );
}

export default App;
