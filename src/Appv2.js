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
    grid-template-columns: 1fr 40%;
    grid-column-gap: 30px;
    width: 100%;
    height: fit-content;
    justify-items:center;
    .video-container{
      display:flex;
      position: relative;
      width:100%;
      #local-video, #remote-video{
        width: 100%;
        border-radius: 10px;
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
      .chat-board{
        display:flex;
        flex:1;
        justify-content: column;
      }
      .inp-chat{
        display:flex;
        flex-direction:row;
        justify-content: space-evenly;
        input{
          width: 70%;
          height:30px;
          padding: 0 10px;
          margin: auto 0;
        }
        button{
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

let callButton;
let startButton;
let hangupButton;
let randomButton;

let inputRoomId;

let startTime = null;

let localStream;
let remoteStream;
let sendChannel;


let remotePeerConnection;

var fb = firebase.initializeApp({ 
  apiKey: "AIzaSyB-q7FU6fQQTOShT_UbybVUBOcXHAhTILo",
  authDomain: "vinpearl-2f7d4.firebaseapp.com",
  databaseURL: "https://vinpearl-2f7d4.firebaseio.com",
  projectId: "vinpearl-2f7d4",
  storageBucket: "vinpearl-2f7d4.appspot.com",
  messagingSenderId: "904958325116",
  appId: "1:904958325116:web:e123ec52c8eea170"
});
const node = 'vinhome/videocall'
var firebaseDB = fb.database();

const servers = {iceServers: [
  {'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'stun:stun.services.mozilla.com'},
]};
var localPeerConnection = null;

const id = uid(10)

console.log(id)
var partnerId = null
var roomDetail = null
var isWatchingFirebase = false
var listener = null;

const App = () => {
  useEffect(() => {
    localVideo = document.getElementById("local-video");
    remoteVideo = document.getElementById("remote-video");

    inputSend = document.getElementById('inp-chat');
    buttonSend = document.getElementById('btn-chat');

    startButton = document.getElementById('start')  
    // callButton = document.getElementById('call')
    randomButton = document.getElementById('random')
    hangupButton = document.getElementById('hangup');
    // event
    

    return () => {
      hangupAction()
    }
  }, [])

  const [isStart, setIsStart] = useState('');
  const [isShowStartBtn, setIsShowStartBtn] = useState(false)
  const [isShowRandomBtn, setIsShowRandomBtn] = useState(true)
  const [listmess, setListMess] = useState([])

  const handleConnection = (e) => {
    console.log('-- event candidate: ', e)
    if(e.candidate)
      sendMessage(JSON.stringify({'ice': e.candidate}))
    else 
      console.log("Sent All Ice") 
  }

  const gotRemoteMediaStream = (event) => {
    const mediaStream = event.stream
    console.log(mediaStream)
    localVideo.style.zIndex = 2
    localVideo.style.width = '35%'
    localVideo.style.border = '1px solid #33ADFF'
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
        console.log(msg.ice)
        localPeerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
      }
      else{
        if(msg.sdp){
          if (msg.sdp.type === "offer") {
            // var r = confirm("Answer call?");
            // if (r == true) {
            console.log('read message offer')
            console.log(msg.sdp)
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
            // } else {
            //   alert("Rejected the call");
            // }
          }
          else if (msg.sdp.type === "answer") {
            console.log('read message answer')
            console.log(msg.sdp)
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
            // localVideo.style.zIndex = 1;
            // localVideo.style.width = '100%'
            // localVideo.style.border = 'none'

            // remoteVideo.style.zIndex = 0;
            // remoteVideo.srcObject = null
            // remoteStream = null
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
    showMyFace()
    
    localPeerConnection = new RTCPeerConnection(servers);
    sendChannel = localPeerConnection.createDataChannel('sendDataChannel');
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;

    localPeerConnection.ondatachannel = receiveChannelCallback;
    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);
    
    
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

  const onSendChannelStateChange = () => {
    const readyState = sendChannel.readyState;
    console.log('Send channel state is: ' + readyState);
    if (readyState === 'open') {

    } else {

    }
  }

  const receiveChannelCallback = (event) => {
    let messArr = listmess.push(event.data)
    setListMess(messArr)
  }

  const sendData = () => {
    const data = inputSend.value;
    inputSend.value = ''
    sendChannel.send(data);
    let messArr = listmess.push(data)

    setListMess(messArr)
  }

  const callAction = () => {
    callButton.disabled = true
    showFriendsFace()
  }

  const hangupAction = () => {
    if(!roomDetail) return
    if(roomDetail.ownerId === id){
      removeRoom(roomDetail.roomId)
    }
    else{
      leaveRoom(roomDetail.roomId)
    }
    if(localPeerConnection){
      localPeerConnection.close();
      localPeerConnection = null;
    }
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
  }

  const randomAction = () => {
    inputRoomId = document.getElementById('input-id')
    if(!inputRoomId) return 
    let randomId = Math.floor(Math.random()*1000000000)
    inputRoomId.value = randomId
    _onChangeRoomId()
  }

  const showMyFace = () => {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(stream => {
      localVideo.srcObject = stream
      localStream = stream
    })
    .then(stream => localPeerConnection.addStream(stream))
    .catch(error => {
      console.error('Error accessing media devices.', error);
    });
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

  const renderListMess = () => {
    return listmess.map((mess) => {
      return <p>{mess}</p>
    })
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
        <div className='mess-container'>
          <div className='chat-board'>
            {
              renderListMess()
            }
          </div>
          <div className='inp-chat'>
            <input type='text' placeholder="Say something..." id='inp-chat' disabled={true}/>
            <button onClick={() => sendData()} id='btn-chat' disabled={true} >Send</button>
          </div>
        </div>
      </div>
    </Bound>
  );
}

export default App;
