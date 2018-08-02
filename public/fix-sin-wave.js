window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();
var context = new AudioContext();
const sineWave = context.createOscillator();

var gainNode = context.createGain ? context.createGain() : context.createGainNode();

sineWave.connect(gainNode);

gainNode.connect(context.destination);

// Play sine wave
if (sineWave.start) {
    sineWave.start(0);
} else {
    sineWave.noteOn(0);
}

gainNode.gain.value = 0;
