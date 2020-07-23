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
  flex-direction: column;
  align-items: center;
  input{
    text-align: center;
    margin: 8px 0;
  }
  .video-container{
    display:flex;
    position: relative;
    width:500px;
    #local-video, #remote-video{
      position: absolute;
      top: 0; 
      right: 0;
      width: 100%;
      border-radius: 10px;
    }
    #local-video{
      z-index:1;
    }
    #remote-video{
      width: 100%;
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

let callButton;
let startButton;
let hangupButton;
let randomButton;

let inputRoomId;

let startTime = null;

let localStream;
let remoteStream;


let remotePeerConnection;

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
const nodeOffer = 'thi'
const nodeAnswer = 'phu'

var firebaseDB = fb.database();

const config = {
    iceServers: [
        {'urls': 'stun:weezi.biz:3478'},
        // {'urls': 'stun:stun.l.google.com:19302'},
        //   {'urls': 'stun:stun.services.mozilla.com'},
    ],
}
const options = {
    optional: [
        {DtlsSrtpKeyAgreement: true},
        {RtpDataChannels: true}
    ]
}
const servers = {iceServers: [
  {'urls': 'stun:weezi.biz:3478'},
// {'urls': 'stun:stun.l.google.com:19302'},
//   {'urls': 'stun:stun.services.mozilla.com'},
]};
const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;
  
var localPeerConnection = null;

const id = uid(10)

console.log(id)
var partnerId = null
var roomDetail = {
    candidates : '',
    sdp : {
        description: '',
        type: "ANSWER"
    }
}
var storeCandidates = []
var isWatchingFirebase = false
var listener = null;
localPeerConnection = new RTCPeerConnection(servers);
let timer = null;
// localPeerConnection = new RTCPeerConnection(config)

const App = () => {
    useEffect(() => {
        localVideo = document.getElementById("local-video");
        remoteVideo = document.getElementById("remote-video");
        startButton = document.getElementById('start')  
        // callButton = document.getElementById('call')
        randomButton = document.getElementById('random')
        hangupButton = document.getElementById('hangup');
        // event
        localPeerConnection.addEventListener('icecandidate', handleConnection);
        localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);
        console.log(localPeerConnection)

        return () => {
            hangupAction()
        }
    }, [])

    const [isStart, setIsStart] = useState('');
    const [isShowStartBtn, setIsShowStartBtn] = useState(false)
    const [isShowRandomBtn, setIsShowRandomBtn] = useState(true)

    const handleConnection = (e) => {
        console.log('-- event candidate: ', e)
        if(e.candidate){
            console.log('candidate: ', e.candidate)
            let str = JSON.stringify({
                sdp: e.candidate.candidate,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                sdpMid: e.candidate.sdpMid
            })
            console.log(str)
            storeCandidates.push(str)
            let strArr = ''
            storeCandidates.forEach(candidate => {
                strArr = strArr + ',' + candidate
            });
            strArr = strArr.substring(1)
            console.log(strArr)
            roomDetail = {
                ...roomDetail,
                candidates: `[${strArr}]`
            }
            if(timer !== null) clearTimeout(timer)
            timer = setTimeout(() => {
              sendMessage()
              timer = null
            }, 1000);
            
            // sendMessage(JSON.stringify({'ice': e.candidate}))
        }
        else 
            console.log("Sent All Ice") 
    }

    const gotRemoteMediaStream = (event) => {
        const mediaStream = event.stream
        console.log('--- media stream remote')
        console.log(mediaStream)
        localVideo.style.zIndex = 2
        localVideo.style.width = '50%'
        localVideo.style.border = '1px solid #33ADFF'
        remoteVideo.srcObject = mediaStream
        remoteStream = mediaStream
    }
        
    const sendMessage = () => {
        if(!roomDetail) return
        firebaseDB.ref(nodeAnswer).set( roomDetail )
    }

    const watchFirebaseChange = (roomId) => {
        listener = firebaseDB.ref(nodeOffer).on('value',(snapshot)=>{
        if(!isWatchingFirebase){
            isWatchingFirebase = true
            console.log('----- Start watching firebase -----')
        }
        let val = snapshot.val()
        //   console.log(val)
            readMessage(val)
        })
    }

    const stopWatchFirebaseChange = (roomId) => {
        if(listener){
            firebaseDB.ref(nodeOffer).off('value', listener)
        }
    }

    const checkExistedRoomId = (roomId) => {
        return new Promise(promise => {
        firebaseDB.ref(nodeOffer).once('value',(snapshot)=>{
            console.log('is existed room: ',snapshot.exists())
            promise(snapshot.exists())
        })
        })
    }

    const getDetailRoom = () => {
        return new Promise(promise => {
        firebaseDB.ref(nodeOffer).once('value',(snapshot)=>{
            console.log('detail room: ',snapshot.val())
            promise(snapshot.val())
        })
        })
    }

    const createRoom = () => {
        console.log(roomDetail)
        firebaseDB.ref(nodeAnswer).set(roomDetail)
    }

    const removeRoom = (roomId) => {
        stopWatchFirebaseChange(roomId)
        firebaseDB.ref(nodeAnswer).child(roomId).remove()
        roomDetail.ownerId = ''
        // sendMessage(JSON.stringify({action: 'remove room'}))
    }

    const leaveRoom = (roomId) => {
        stopWatchFirebaseChange(roomId)
        roomDetail.friendId = ''
        // sendMessage(JSON.stringify({action: 'leave room'}))
    }
    
    const readMessage = (data) => {
        console.log('read firebase: ',data)
        if(!data) return
        
        
        if(data.sdp){
            var sdp = {
                sdp: data.sdp.description,
                type: 'offer'
            }
            console.log('read message offer')
            console.log(sdp)
            localPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
                .then(() => {
                    // localPeerConnection.RTCRtpTransceiver.setCodecPreferences('video/VP8')
                    localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
                    if (supportsSetCodecPreferences) {
                        const preferredCodec = 'video/VP8'
                        console.log(preferredCodec);
                        if (preferredCodec !== '') {
                          const [mimeType, sdpFmtpLine] = preferredCodec.split(' ');
                          const {codecs} = RTCRtpSender.getCapabilities('video');
                          const selectedCodecIndex = codecs.findIndex(c => c.mimeType === mimeType && c.sdpFmtpLine === sdpFmtpLine);
                          const selectedCodec = codecs[selectedCodecIndex];
                          codecs.slice(selectedCodecIndex, 1);
                          codecs.unshift(selectedCodec);
                          console.log(codecs);
                          const transceiver = localPeerConnection.getTransceivers().find(t => t.sender && t.sender.track === localStream.getVideoTracks()[0]);
                          transceiver.setCodecPreferences(codecs);
                          console.log('Preferred video codec', selectedCodec);
                        }
                      }
                })
                .then(() => {
                    console.log(localPeerConnection)
                    localPeerConnection.createAnswer()
                    // console.log(localPeerConnection)
                })
                .then(answer => {
                    console.log(localPeerConnection)
                    localPeerConnection.setLocalDescription(answer)
                })
                .then(() => {
                    console.log(localPeerConnection)
                    roomDetail = {
                        ...roomDetail,
                        sdp : {
                            description: localPeerConnection.localDescription.sdp,
                            type: "ANSWER"
                        }
                    }
                    sendMessage()
                })
                .catch(error => {
                    console.error( error);
                });
        }
        if(data.candidates){
            const regexSDP = /"sdp":/gi;
            var tempStr = data.candidates.replace(regexSDP,'\"candidate\":');
            // const regexICE = /"candidate:/gi;
            // tempStr = tempStr.replace(regexICE,"\"candidate\":\"");
            // tempStr = tempStr.substring(2, tempStr.length-2)
            // let splitStr = tempStr.split('},{')
            // console.log(splitStr)
            // splitStr.forEach(item => {
            //     let str = "{" + item + "}"
            //     console.log(str)
            //     console.log(JSON.parse(str))
            // });
            console.log(JSON.parse(data.candidates))
            
            let candidate = JSON.parse(tempStr)
            console.log(candidate)
            console.log('-- add ice candidate')
            // localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate[candidate.length-1]));
            
            candidate.forEach(ice => {
                console.log(ice)
                localPeerConnection.addIceCandidate(new RTCIceCandidate(ice));
            });
        }
        // var sender = data.sender;
        // if (sender !== id) {
        // if (msg.ice !== undefined) {
        //     console.log('-- add ice candidate')
        //     localPeerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
        // }
        // else{
        //     if(msg.sdp){
        //     if (msg.sdp.type === "offer") {
        //         // var r = confirm("Answer call?");
        //         // if (r == true) {
        //         console.log('read message offer')
        //         localPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        //         .then(() => localPeerConnection.createAnswer())
        //         .then(answer => localPeerConnection.setLocalDescription(answer))
        //         .then(() => {
        //             roomDetail.friendId = data.friendId
        //             sendMessage(JSON.stringify({'sdp': localPeerConnection.localDescription}))
        //         })
        //         .catch(error => {
        //             console.error( error);
        //         });
        //         // } else {
        //         //   alert("Rejected the call");
        //         // }
        //     }
        //     else if (msg.sdp.type === "answer") {
        //         console.log('read message answer')
        //         localPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        //         .catch(error => {
        //         console.error( error);
        //         });
        //     }
        //     }
        //     else if(msg.action){
        //     if (msg.action === "leave room") {
        //         console.log('leave room')
        //         sendMessage(JSON.stringify({action: ''}))
        //         // localVideo.style.zIndex = 1;
        //         // localVideo.style.width = '100%'
        //         // localVideo.style.border = 'none'

        //         // remoteVideo.style.zIndex = 0;
        //         // remoteVideo.srcObject = null
        //         // remoteStream = null
        //         hangupAction()
        //     }
        //     else if (msg.action === "remove room") {
        //         console.log('remove room')
        //         sendMessage(JSON.stringify({action: ''}))
        //         hangupAction()
        //     }
        //     }
        // } 
        // }
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

        
        
        // let isExisted = await checkExistedRoomId(rID)
        // if(!isExisted){
        //   createRoom(rID)
        // }
        // else{
        //   roomDetail = await getDetailRoom(rID)
        //   roomDetail.friendId = id;
        //   if(roomDetail){
        //     showFriendsFace()
        //   }
        // }
        setIsStart(true)
        watchFirebaseChange(rID)
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
    // .then(() => sendMessage(JSON.stringify({'sdp': localPeerConnection.localDescription})) );
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

    return (
        <Bound>
        {
            isStart?
            <p>Remote ID: {nodeOffer}</p>
            :
            <input type='text' placeholder="input room ID" id='input-id' 
                style={{width: '250px', height: '30px'}} value='thi'
                onChange={_onChangeRoomId}/>
        }
        
        <div className='button-container'>
            {
            isStart ?
            // <button id="call" onClick={()=>callAction()} disabled = {isShowCallBtn?false:true}>Call</button>
            <button id="hangup" onClick={()=>hangupAction()}>Hang Up</button>
            :
            <React.Fragment>
                <button id="start" onClick={()=>startAction()} >Start</button>
                {/* <button id="random" onClick={()=>randomAction()} disabled={isShowRandomBtn?false:true} >Random</button> */}
            </React.Fragment>
            }
            
        </div>
        <div className='video-container'>
            <video id="local-video" autoPlay></video>
            <video id="remote-video" autoPlay></video>
        </div>
        </Bound>
    );
}

export default App;
