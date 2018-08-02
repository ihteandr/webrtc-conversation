function Conversation(myID, remoteID, signaling, configuration) {
    this.myID = myID;
    this.remoteID = remoteID;
    this.signaling = signaling;
    this.video = null;
    this.configuration = configuration;
    this.connection = null;
    this.offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };
    this.onDisconnect = () => {};
}

Conversation.prototype.addIceCandidate = function(candidate) {
    this.connection.addIceCandidate(candidate);
};

Conversation.prototype.createOffer = async function(stream) {
    await this.initCoonection();
    this.connection.addStream(stream);
    this.connection.createOffer(this.offerOptions).then((offer) => {
        this.connection.setLocalDescription(offer, () => {
            this.signaling.send({
                type: 'offer',
                data: {
                    myID: this.myID,
                    remoteID: this.remoteID,
                    offer: JSON.parse(JSON.stringify(this.connection.localDescription))
                }
            });
        }, (e) => {
            console.log('error with set local descrition', e);
        });
    })
    .catch((er) => {
        console.log(er);
    });
};

Conversation.prototype.initByAnswer = function (answer) {
    let answerDescription = new RTCSessionDescription(answer);
    this.connection.setRemoteDescription(answerDescription, () => {

    }, (e) => {
        console.log('error with set remote descr', e);
    });
};

Conversation.prototype.initByOffer = async function(offer, stream) {
    let offerDescription = new RTCSessionDescription(offer);
    await this.initCoonection();
    this.connection.addStream(stream);
    this.connection.setRemoteDescription(offerDescription, () => {
        this.connection.createAnswer().then((answerDescription) => {
            this.connection.setLocalDescription(answerDescription, () => {
                this.signaling.send({
                    type: 'answer',
                    data: {
                        myID: this.myID,
                        remoteID: this.remoteID,
                        answer: JSON.parse(JSON.stringify(answerDescription))
                    },
                });
            }, (e) => {
                console.log('offer:error', e)
            });
        });
    }, (e) => {
        console.log('set remote error', e);
    });
};

Conversation.prototype.initCoonection = function(){
    return new Promise((resolve, reject) => {
        this.connection = new RTCPeerConnection(this.configuration);
        this.connection.onicecandidate = (event) => {
            this.signaling.send({
                type: 'candidate',
                data: {
                    myID: this.myID,
                    remoteID: this.remoteID,
                    candidate: JSON.parse(JSON.stringify(event.candidate))
                },
            });
        };

        let isNestedNegoriation = true;
        this.connection.onnegotiationneeded = (e) => {
        };
        
        this.connection.oniceconnectionstatechange = (e) => {
            if (this.connection.iceConnectionState == 'disconnected') {
                this.video.remove();
                this.onDisconnect();
            }
        };

        this.connection.onsignalingstatechange = (e) => {  // Workaround for Chrome: skip nested negotiations
        };
        this.connection.onerror = (e) => {
            console.log('PC error', e);
        };   

        this.connection.onaddstream = (event) => {
            if (this.video) {
                console.log('remove video');
                this.video.remove();
            }
            const video = document.createElement('video');
            video.setAttribute('autoplay', true);
            video.setAttribute('volume', 1);
            video.volume = 1;
            video.srcObject = event.stream;
            this.video = video;
            document.body.appendChild(video);
        };
        resolve();
    });
};