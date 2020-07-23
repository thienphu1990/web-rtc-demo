import React, { useEffect, useState } from 'react';
import styled from 'styled-components'
// import Peer from 'peerjs';
import uid from 'uid'
import * as firebase from 'firebase';
import { findAllByDisplayValue } from '@testing-library/react';

const Bound = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 100vh;
  flex-direction: column;
  align-items: center;
  input{
    text-align: center;
    margin: 8px 0;
  }
  .remote-container{
    display:grid;
    grid-template-columns: 640px 1fr;
    grid-column-gap: 30px;
    width: calc(100% - 60px);
    height: 480px;
    justify-items:center;
    padding: 0 30px;
    .video-container{
      display:flex;
      position: relative;
      width:100%;
      #local-video, #remote-video{
        width: 640px;
        border-radius: 10px;
        top: 0; 
        right: 0;
      }
      #local-video{
        z-index:1;
      }
      #remote-video{
        position: absolute;
        top: 0; 
        right: 0;
        z-index: 0;
      }
    }
    .mess-container{
      display:flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: auto;
      #no-one{
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%)
      }
      .chat-board{
        display:flex;
        flex:1;
        flex-direction: column;
        height: calc(480px - 34px);
        overflow: auto;
        .friend-mess, .your-mess{
          display: flex;
          width: fit-content;
          max-width: 70%;
          padding: 12px 20px;
          margin-bottom: 5px;
          p{
            margin: 0;
          }
        }
        .friend-mess{
          border-radius: 10px 10px 10px 3px;
          background-color: #e8e7e6;
          align-self: flex-start;
        }
        .your-mess{
          border-radius: 10px 10px 3px 10px;
          background-color: #33ADFF;
          color: #fff;
          align-self: flex-end;
        }
      }
      .chat-control{
        display:flex;
        flex-direction:row;
        justify-content: space-evenly;
        #inp-chat{
          width: 70%;
          height:30px;
          padding: 0 10px;
          margin: auto 0;
          text-align: left;
        }
        #btn-chat{
          display: flex;
          border-radius: 3px;
          background-color: #33ADFF;
          color: #fff;
          justify-content: center;
          align-items: center;
          width: 150px;
          height: 32px;
          margin: auto 0;
        }
      }
    }
  }
  
  .button-container{
    display: flex;
    flex-direction: row;
    width:100%;
    height: 50px;
    margin: 20px 0;
    justify-content:center;
    #start, #call, #hangup, #random{
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
  audio: false
}

const offerOptions = {
  offerToReceiveVideo: 1,
}

let localVideo;
let remoteVideo;
let inputSend;
let buttonSend;
let chatBoard;

let callButton;
let startButton;
let hangupButton;
let randomButton;

let inputRoomId;

let localStream;
let remoteStream;
let sendChannel;
let receiveChannel;

// var fb = firebase.initializeApp({ 
//   apiKey: "AIzaSyB-q7FU6fQQTOShT_UbybVUBOcXHAhTILo",
//   authDomain: "vinpearl-2f7d4.firebaseapp.com",
//   databaseURL: "https://vinpearl-2f7d4.firebaseio.com",
//   projectId: "vinpearl-2f7d4",
//   storageBucket: "vinpearl-2f7d4.appspot.com",
//   messagingSenderId: "904958325116",
//   appId: "1:904958325116:web:e123ec52c8eea170"
// });

var fb = firebase.initializeApp({ 
  apiKey: "AIzaSyBmk_VinmqMiLZx_-fOwq01k37y-utj1T0",
  authDomain: "weeio-7a3a7.firebaseapp.com",
  databaseURL: "https://weeio-7a3a7.firebaseio.com",
  projectId: "weeio-7a3a7",
  storageBucket: "weeio-7a3a7.appspot.com",
  messagingSenderId: "135073151177",
  appId: "1:135073151177:web:61e33710ac8f29a991f518",
  measurementId: "G-VJB5BWDP7H"
});

const node = 'videocall'
var firebaseDB = fb.database();

const servers = {iceServers: [
  {'urls': 'stun:weezi.biz:3478'},
  // {'urls': 'stun:stun.l.google.com:19302'},
  // {'urls': 'stun:stun.services.mozilla.com'},
]};
const options = {optional: [
  {'DtlsSrtpKeyAgreement': true}
]};

var localPeerConnection = null;

const id = uid(10)

console.log(id)
var partnerId = null
var roomDetail = null
var isWatchingFirebase = false
var listener = null;
var listmess = []

const App = () => {
  const [isStart, setIsStart] = useState(false);
  const [isReadyChat, setIsReadyChat] = useState(false)
  const [isShowStartBtn, setIsShowStartBtn] = useState(false)
  const [isShowRandomBtn, setIsShowRandomBtn] = useState(true)
  const [data, setData] = useState([])

  let isSendStateReady = false
  let isReceiveStateReady = false

  useEffect(() => {
    localVideo = document.getElementById("local-video");
    remoteVideo = document.getElementById("remote-video");
    chatBoard = document.getElementById("chat-board-id")
    inputSend = document.getElementById('inp-chat');
    buttonSend = document.getElementById('btn-chat');

    startButton = document.getElementById('start')  
    // callButton = document.getElementById('call')
    randomButton = document.getElementById('random')
    hangupButton = document.getElementById('hangup');
    
    return () => {
      hangupAction()
    }
  }, [])

  useEffect(() => {
    if(chatBoard){
      chatBoard.scrollTo(0, chatBoard.scrollHeight)
    }
  }, [data])

  const handleConnection = (e) => {
    console.log('-- event candidate: ', e)
    if(e.candidate)
      sendMessage(JSON.stringify({'ice': e.candidate}))
    else 
      console.log("Sent All Ice") 
  }

  const handleConnectionChange = (e) => {
    const peerConnection = e.target;
    if(peerConnection.iceConnectionState === 'disconnected'){
      disconnect()
    }
  }

  const gotRemoteMediaStream = ({streams: [stream]}) => {
    const mediaStream = stream
    console.log(mediaStream)
    localVideo.style.zIndex = 2
    localVideo.style.width = '35%'
    localVideo.style.border = '1px solid #33ADFF'
    localVideo.style.position = 'absolute'
    remoteVideo.style.position = 'unset'
    remoteVideo.srcObject = mediaStream
    remoteStream = mediaStream
  }
    
  const sendMessage = (data) => {
    if(!roomDetail) return
    firebaseDB.ref(node).child(roomDetail.roomId).set({ ...roomDetail, sender: id, message: data })
  }

  const watchFirebaseChange = (roomId) => {
    listener = firebaseDB.ref(node).child(roomId).on('value',(snapshot)=>{
      if(!isWatchingFirebase){
        isWatchingFirebase = true
        console.log('----- Start watching firebase -----')
      }
      let val = snapshot.val()
      readMessage(val)
    })
  }

  const stopWatchFirebaseChange = (roomId) => {
    if(listener){
        firebaseDB.ref(node).child(roomId).off('value', listener)
    }
  }

  const checkExistedRoomId = (roomId) => {
    return new Promise(promise => {
      firebaseDB.ref(node).child(roomId).once('value',(snapshot)=>{
        console.log('is existed room: ',snapshot.exists())
        promise(snapshot.exists())
      })
    })
  }

  const getDetailRoom = (roomId) => {
    return new Promise(promise => {
      firebaseDB.ref(node).child(roomId).once('value',(snapshot)=>{
        console.log('detail room: ',snapshot.val())
        promise(snapshot.val())
      })
    })
  }

  const createRoom = (roomId) => {
    roomDetail = {
      ownerId : id,
      friendId : '',
      roomId,
      message: '',
      sender: id 
    }
    firebaseDB.ref(node).child(roomId).set(roomDetail)
  }

  const removeRoom = (roomId) => {
    stopWatchFirebaseChange(roomId)
    firebaseDB.ref(node).child(roomId).remove()
    roomDetail.ownerId = ''
    sendMessage(JSON.stringify({action: 'remove room'}))
  }

  const leaveRoom = (roomId) => {
    stopWatchFirebaseChange(roomId)
    roomDetail.friendId = ''
    sendMessage(JSON.stringify({action: 'leave room'}))
  }
    
  const readMessage = (data) => {
    if(!data) return
    if(!data.message) return
    
    var msg = JSON.parse(data.message);
    console.log('read firebase: ',data)
    var sender = data.sender;
    if (sender !== id) {
      if (msg.ice !== undefined) {
        console.log('-- add ice candidate')
        localPeerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
      }
      else{
        if(msg.sdp){
          if (msg.sdp.type === "offer") {
            console.log('read message offer')
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
              .then(() => localPeerConnection.createAnswer())
              .then(answer => localPeerConnection.setLocalDescription(answer))
              .then(() => {
                roomDetail.friendId = data.friendId
                sendMessage(JSON.stringify({'sdp': localPeerConnection.localDescription}))
              })
              .catch(error => {
                console.error( error);
              });
          }
          else if (msg.sdp.type === "answer") {
            console.log('read message answer')
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .catch(error => {
              console.error( error);
            });
          }
        }
        else if(msg.action){
          if (msg.action === "leave room") {
            console.log('leave room')
            sendMessage(JSON.stringify({action: ''}))
            hangupAction()
          }
          else if (msg.action === "remove room") {
            console.log('remove room')
            sendMessage(JSON.stringify({action: ''}))
            hangupAction()
          }
        }
      } 
    }
  };

  const startAction = async () => {
    inputRoomId = document.getElementById('input-id')
    if(!inputRoomId) return
    let rID = inputRoomId.value
    if(!rID || rID.length === 0){
      alert('please input roomID')
      return
    }
    setIsShowStartBtn(false)
    setIsShowRandomBtn(false)
    
    createLocalPeerConnection()
    
    let isExisted = await checkExistedRoomId(rID)
    if(!isExisted){
      createRoom(rID)
    }
    else{
      roomDetail = await getDetailRoom(rID)
      roomDetail.friendId = id;
      if(roomDetail){
        showFriendsFace()
      }
    }
    setIsStart(true)
    watchFirebaseChange(rID)
  }

  const createLocalPeerConnection = () => {
    localPeerConnection = new RTCPeerConnection(servers, options);

    sendChannel = localPeerConnection.createDataChannel('sendChannel');
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;

    localPeerConnection.ondatachannel = receiveChannelCallback
    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    localPeerConnection.addEventListener('track', gotRemoteMediaStream);
    
    showMyFace()
  }

  const closeLocalPeerConnection = () => {
    if(!localPeerConnection) return
    localPeerConnection.close()
    localPeerConnection = null;
  }

  const onSendChannelStateChange = () => {
    const readyState = sendChannel.readyState;
    console.log('Send channel state is: ' + readyState);
    if (readyState === 'open') {
      isSendStateReady = true
      if(isReceiveStateReady) 
        setIsReadyChat(true)
    } else {
      isSendStateReady = false
      setIsReadyChat(false)
    }
  }

  const receiveChannelCallback = (event) => {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }

  const handleReceiveMessage = (event) => {
    if(!event.data) return
    const dataRec = JSON.parse(event.data)
    console.log(dataRec)
    let messArr = listmess.concat([dataRec])
    setData(messArr)
    listmess.push(dataRec)
  }

  const handleReceiveChannelStatusChange = () => {
    const readyState = receiveChannel.readyState;
    console.log('Receive channel state is: ' + readyState);
    if (readyState === 'open') {
      isReceiveStateReady = true
      if(isSendStateReady) setIsReadyChat(true)
    } else {
      isReceiveStateReady = false
      setIsReadyChat(false)
    }
  }

  const sendData = () => {
    if(inputSend.value.length === 0 ) return
    const dataRec = {userId: id, message: inputSend.value}
    const dataSend = JSON.stringify(dataRec);
    inputSend.value = ''
    inputSend.focus()
    sendChannel.send(dataSend);
    let messArr = listmess.concat([dataRec])
    setData(messArr)
    listmess.push(dataRec)
  }

  const disconnect = () => {
    closeLocalPeerConnection()
    createLocalPeerConnection()

    localVideo.style.zIndex = 1;
    localVideo.style.width = '100%'
    localVideo.style.border = 'none'

    remoteVideo.style.zIndex = 0;
    remoteVideo.srcObject = null
    remoteStream = null

    setIsReadyChat(false)
  }

  const hangupAction = () => {
    if(!roomDetail) return
    if(roomDetail.ownerId === id){
      removeRoom(roomDetail.roomId)
    }
    else{
      leaveRoom(roomDetail.roomId)
    }

    closeLocalPeerConnection()
    createLocalPeerConnection()
    
    localVideo.style.zIndex = 1;
    localVideo.style.width = '100%'
    localVideo.style.border = 'none'
    localVideo.srcObject = null

    stopCamera()

    remoteVideo.style.zIndex = 0;
    remoteVideo.srcObject = null
    remoteStream = null
    
    setIsShowStartBtn(true)
    setIsShowRandomBtn(true)
    setIsStart(false)
    setIsReadyChat(false)
  }

  const randomAction = () => {
    inputRoomId = document.getElementById('input-id')
    if(!inputRoomId) return 
    let randomId = Math.floor(Math.random()*1000000000)
    inputRoomId.value = randomId
    _onChangeRoomId()
  }

  const showMyFace = async () => {
    const gumStream = await navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
    for (const track of gumStream.getTracks()) {
      localPeerConnection.addTrack(track, gumStream);
    }
    getLocalStream(gumStream)
  }

  const getLocalStream = (stream) => {
    if(!localVideo) return
    console.log(stream)
    localVideo.srcObject = stream
    localStream = stream
  }

  const stopCamera = () => {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(stream => {
      console.log('stop camera')
      // can also use getAudioTracks() or getVideoTracks()
      var track = stream.getTracks().forEach((track) => track.stop())
      // ...
      track.stop();
    })
    .catch(error => {
      console.log('getUserMedia() error', error);
    });
  }

  const showFriendsFace = () => {
    localPeerConnection.createOffer()
    .then(offer => localPeerConnection.setLocalDescription(offer) )
    .then(() => sendMessage(JSON.stringify({'sdp': localPeerConnection.localDescription})) );
  }

  const _onChangeRoomId = (e) => {
    inputRoomId = document.getElementById('input-id')
    let val = inputRoomId.value
    if(val && val.length > 0){
      setIsShowStartBtn(true)
    }
    else{
      setIsShowStartBtn(false)
    }
  }

  const renderListMessage = () => {
    return data.map((mess, i) => {
      return (
        <div key={i} className={mess.userId === id? 'your-mess': 'friend-mess'}>
          <p>{mess.message}</p>
        </div>
      )
    })
  }

  const onTypeMessage = () => {
    let message = inputSend.value
    if(!message || message.length > 0) buttonSend.disabled = true
    else buttonSend.disabled = false
  }

  const onKeyUpMessage = (e) => {
    if (e.keyCode === 13) {
      sendData();
    }
  }

  return (
    <Bound>
      <p>Your ID: {id}</p>
      {
        isStart?
        <p>Room ID: {roomDetail && roomDetail.roomId}</p>
        :
        <input type='text' placeholder="input room ID" id='input-id' 
          style={{width: '250px', height: '30px'}}
          onChange={_onChangeRoomId}/>
      }
      
      <div className='button-container'>
        {
          isStart ?
          // <button id="call" onClick={()=>callAction()} disabled = {isShowCallBtn?false:true}>Call</button>
          <button id="hangup" onClick={()=>hangupAction()}>Hang Up</button>
          :
          <React.Fragment>
            <button id="start" onClick={()=>startAction()} disabled={isShowStartBtn?false:true} >Start</button>
            <button id="random" onClick={()=>randomAction()} disabled={isShowRandomBtn?false:true} >Random</button>
          </React.Fragment>
        } 
      </div>
      <div className='remote-container' style={{visibility: isStart?'unset':'hidden'}}>
        <div className='video-container'>
          <video id="local-video" autoPlay></video>
          <video id="remote-video" autoPlay></video>
        </div>
        <div className='mess-container' style={{opacity: isReadyChat?1:0.5}}>
          {
            !isReadyChat &&
            <h1 id='no-one'>No one to chat</h1>
          }
          <div className='chat-board' id='chat-board-id'>
            {
              renderListMessage()
            }
          </div>
          <div className='chat-control'>
              <input type='text' placeholder="Say something..." id='inp-chat' disabled={isReadyChat?false:true} 
                onKeyUp={onKeyUpMessage}/>
              <button onClick={()=>sendData()} id='btn-chat' disabled={isReadyChat?false:true} >Send</button>
          </div>
        </div>
      </div>
    </Bound>
  );
}

export default App;
