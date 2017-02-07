//importScripts("../lib/libg723.js");

var sampleRate = 0;

var recAudioU16 = [];
var recAudioLen = 0;

this.onmessage = function(e){
    switch(e.data.command){
        case 'init':
            init(e.data.config);
            break;
        case 'recordAudio':
            recordAudio(e.data.buffer);
            break;
        case 'playAudio':
            playAudio(e.data.buffer);
            break;
        case 'exportData':
            exportData();
            break;
        case 'importData':
            importData(e.data.buffer);
            break;
        case 'clear':
            clear();
            break;
    }
};

function init(config){
    sampleRate = config.sampleRate;
}

function recordAudio(inputBuffer) {
    var interleaved = interleave(inputBuffer[0], inputBuffer[1]);
    var output = FloatToWord(interleaved);    
    recAudioU16.push(output);
    recAudioLen += output.length;
}

function exportData() {
	if (recAudioLen <= 480 )
		return;

    var output = mergeBuffersi16(recAudioU16, recAudioLen);
	this.postMessage({ msg: 'export', buf: output });
}

function importData(data) {
    var floatData = WordToFloat(data);
    this.postMessage({ msg: 'import', buf: floatData });
}

function playAudio(outBuffer) {
    var output = [];
    output.push(outBuffer[0]);
    output.push(outBuffer[1]);
    //console.log("Audiosize:" + inputBuffer[0].length);
}

function clear(){
    recAudioLen = 0;
    recAudioU16 = [];
}

function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
        result.set(recBuffers[i], offset);
        offset += recBuffers[i].length;
    }
    return result;
}

function mergeBuffersi16(recBuffers, recLength) {
    var result = new Uint16Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++) {
        result.set(recBuffers[i], offset);
        offset += recBuffers[i].length;
    }
    return result;
}

function interleave(inputL, inputR){
    var result = new Float32Array(inputL.length);
    for (var i = 0; i < inputL.length; ++i)
        result[i] = 0.5 * (inputL[i] + inputR[i]);
    return result;
}

function FloatToWord(input) {
    var offset = 0;
    var buffer = new ArrayBuffer(input.length * 2);
    var output = new DataView(buffer);

    for (var i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Uint16Array(output.buffer); ;
}

function WordToFloat(input) {
    var offset = 0;
    var buffer = new ArrayBuffer(input.length * 4);
    var output = new DataView(buffer);

    for (var i = 0; i < input.length; i++, offset += 4) {
        var s = input[i];
		var s1 = s < 32768 ? s / 0x7FFF : (s - 65536) / 0x8000;

        output.setFloat32(offset, s1, true);
    }

    return new Float32Array(output.buffer);
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
