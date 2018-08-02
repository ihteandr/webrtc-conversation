
let ID = null;
let STREAM = null;
let RoomName = null;
let conversations = [];
const configuration = {
    iceServers: [
        {url:'stun:stun01.sipphone.com'},
        {url:'stun:stun.ekiga.net'},
        {url:'stun:stun.fwdnet.net'},
        {url:'stun:stun.ideasip.com'},
        {url:'stun:stun.iptel.org'},
        {url:'stun:stun.rixtelecom.se'},
        {url:'stun:stun.schlund.de'},
        {url:'stun:stun.l.google.com:19302'},
        {url:'stun:stun1.l.google.com:19302'},
        {url:'stun:stun2.l.google.com:19302'},
        {url:'stun:stun3.l.google.com:19302'},
        {url:'stun:stun4.l.google.com:19302'},
        {url:'stun:stunserver.org'},
        {url:'stun:stun.softjoys.com'},
        {url:'stun:stun.voiparound.com'},
        {url:'stun:stun.voipbuster.com'},
        {url:'stun:stun.voipstunt.com'},
        {url:'stun:stun.voxgratia.org'},
        {url:'stun:stun.xten.com'},
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }],
    receiveMedia: {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    },
};

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getMediaStream() {
    if (STREAM) {
        return Promise.resolve(STREAM);
    }
    return navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true
        });
}

function SignalChannel() {
    //this.socket = io('https://localhost:3333/', {secure: true});
    this.socket = io('https://omprice.com:3333/', {secure: true});
    this.socket.on('disconnect', () => {
        console.log('disconnect');
    })
    this.socket.on('connect', () => {
        console.log('socket connected');
        getMediaStream()
            .then((stream) => {
                STREAM = stream;
                if (this.video) {
                    this.video.remove();
                    signalling.socket.emit('join', RoomName);
                }
                this.video = document.createElement('video');
                this.video.setAttribute('autoplay', true);
                this.video.setAttribute('muted', true);
                this.video.muted = true;
                this.video.volume = 0;
                this.video.setAttribute('volume', 0);
                this.video.srcObject = stream;
                document.body.appendChild(this.video);
                function onlyRemote(fn) {
                    return (data) => {
                        if (data.myID !== ID) {
                            fn(data);
                        }
                    }
                }
                function onlyForMe(fn) {
                    return (data) => {
                        if (data.remoteID === ID) {
                            fn(data);
                        }
                    }
                }
                this.socket.on('answer', onlyRemote(onlyForMe((data) => {
                    const conversation = conversations.find((conversation) => {
                        return conversation.remoteID === data.myID;
                    });
                    conversation.initByAnswer(data.answer);
                })));

                this.socket.on('candidate', onlyRemote(onlyForMe((data) => {
                    const conversation = conversations.find((conversation) => {
                        return conversation.remoteID === data.myID;
                    });
                    conversation.addIceCandidate(data.candidate);            
                })));

                this.socket.on('offer', onlyRemote(onlyForMe((data) => {
                    const conversation = new Conversation(ID, data.myID, this, configuration);
                    conversations.push(conversation);
                    conversation.onDisconnect = () => {
                        conversations.splice(conversations.indexOf(conversation), 1);
                    };
                    conversation.initByOffer(data.offer, STREAM);
                })));

                this.socket.on('joined', (message) => {
                    ID = message.local;
                    message.users.forEach((userId) => {
                        const conversation = new Conversation(ID, userId, this, configuration);
                        conversation.onDisconnect = () => {
                            conversations.splice(conversations.indexOf(conversation), 1);
                        };
                        conversations.push(conversation);
                        conversation.createOffer(STREAM);
                    });
                });
            })
            .catch(e => console.log(`getUserMedia() error: ${e.name}`, e));
    });
}

SignalChannel.prototype.send = function (message) {
    this.socket.emit(message.type, {
        room: RoomName,
        data: message.data
    });
};
const signalling = new SignalChannel();

function start(event) {
    const element = document.getElementById('roomName');
    RoomName = element.value;
    console.log('roomName', RoomName);
    signalling.socket.emit('join', RoomName);
    event.target.parentNode.innerHTML = `<h3>You are joined to room '${RoomName}'</h3>`
}
