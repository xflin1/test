(function (window) {

    var WORKER_PATH = 'audio/recorderWorker.js';

    var Recorder = function (source, cfg) {
        var _this = this;

        var config = cfg || {};
        var bufferLen = config.bufferLen || 4096;
        this.context = source.context;
        this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context, bufferLen, 2, 2);
        this.floatQueue = [];
        this.floatQueue_offset = 0;
        this.floatQueue_length = 0;
		this.timer_cleared = true;

        var worker = new Worker(WORKER_PATH);
        this.recLength = 0,
        this.recBuffersL = [],
        this.recBuffersR = [],
        this.sampleRate;

        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate
            }
        });
        var recording = false, currCallback;
		var isready = false;

        this.node.onaudioprocess = function (e) {
            if (!recording)
                return;

            _this.inputAudio(e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1));
            _this.outputAudio(e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1));
            //console.log("Audio Size:" + e.inputBuffer.getChannelData(1).byteLength);
        }

        this.inputAudio = function (inDataL, inDataR) {
            worker.postMessage({
                command: 'recordAudio',
                buffer: [inDataL, inDataR]
            });
        }

        this.outputAudio = function (outDataL, outDataR) {
            if (_this.floatQueue.length == 0)
                return;

            var output = [];

            output.push(outDataL);
            output.push(outDataR);

            var total_samples = output[0].length;
            var copied = 0;
            while (copied < total_samples && this.floatQueue.length > 0) {
                var copy_samples = Math.min(this.floatQueue[0].length - this.floatQueue_offset, total_samples - copied);

                for (var ch = 0; ch < output.length; ++ch) {
                    output[ch].set(this.floatQueue[0].subarray(this.floatQueue_offset, this.floatQueue_offset + copy_samples), copied);
                }
                copied += copy_samples;
                this.floatQueue_offset += copy_samples;
                this.queue_samples -= copy_samples;

                if (this.floatQueue[0].length == this.floatQueue_offset) {
                    this.floatQueue_offset = 0;
                    this.floatQueue.shift();
                }
            }
        }

        this.exportData = function (cb) {
            if (!recording)
                return;
			
            currCallback = cb || config.callback;
            if (!currCallback) throw new Error('Callback not set');

            worker.postMessage({ command: 'exportData' });
        }

        this.importData = function (data) {
             if (!recording)
                return;
           worker.postMessage({ command: 'importData', buffer:data });
            //console.log("Queue Size:" + data.length + ":" + data.byteLength + ":" + _this.floatQueue.length);
        }


		this.audioUpdate = function (interval, cb) {
            if (!recording)
                return;

			var _this = this;
			currCallback = cb || config.callback;
            if (!currCallback) throw new Error('Callback not set');


			if (interval === void 0) { interval = 30; }

			if (!this.timer_cleared) {
				return;
			}

			this.timer_cleared = false;

			window.setTimeout(function () {
				_this.exportData(cb);
				_this.timer_cleared = true;
				_this.audioUpdate(interval, cb);
			}, interval);
		};

        worker.onmessage = function (e) {
            if (!recording)
                return;
            switch (e.data.msg) {
                case 'export':
					_this.clear();
                    currCallback(e.data.buf);
                    _this.clear();
                    break;
                case 'import':
                    _this.floatQueue.push(e.data.buf);
                    break;
            }
        }

        this.configure = function (cfg) {
            for (var prop in cfg) {
                if (cfg.hasOwnProperty(prop)) {
                    config[prop] = cfg[prop];
                }
            }
        }

        this.record = function () {
            recording = true;
        }

		this.stop = function () {
            recording = false;
			isready = false;
        }

        this.isRecord = function () {
            return recording;
        }

        this.clear = function () {
            worker.postMessage({ command: 'clear' });
        }

        source.connect(this.node);
        this.node.connect(this.context.destination);    //this should not be necessary
    };

    window.Recorder = Recorder;

})(window);
