/// <reference path="renderer.ts" />

var VideoAudio = (function () {
    var audioRecorder = null;
    var audioCodec = null;
	var AudioContext = window.AudioContext || window.webkitAudioContext;

    function VideoAudio() {

        var _this = this;

        this.target_interval = 1000 / 10 - 10;
        this.prev_video_time = 0;
        this.timer_cleared = true;
        this.queued_frames = 0;
        this.max_queued_frames = 0;
        this.encoded_frames = 0;
        this.encoded_frames_period = 0;
        this.encoded_bytes = 0;
        this.encoded_bytes_period = 0;
        this.decoder_queue = 0;

        this.nUserCount = 1;

        this.videosrc = document.getElementById("videosrc");
        this.canvas_src = document.getElementById("canvas_src");
        this.canvas_src_ctx = this.canvas_src.getContext("2d");

        this.canvas_dst = [];
        this.canvas_dst[0] = document.getElementById("canvas_dst_1");
        this.canvas_dst[1] = document.getElementById("canvas_dst_2");
        this.canvas_dst[2] = document.getElementById("canvas_dst_3");
        this.canvas_dst[3] = document.getElementById("canvas_dst_4");
        this.canvas_dst[4] = document.getElementById("canvas_dst_5");

        this.encoder = 0;
        this.decoder = [];
        this.renderer = [];
        this.renderer_initialized = [];
        this.audio_context = new AudioContext;

        for (var i = 0; i < _this.nUserCount; ++i)
            _this.renderer_initialized[i] = false;

        this.status = document.getElementById("status");
        this.audioRecorder = null;
        this.audioCodec = new AudioCodec();

        window.URL = window.URL || window.webkitURL;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;

        switch (document.getElementById("encoder").value) {
            case "x264":
                this.encoder = new Worker("video/x264_encoder.js");
                break;
            case "openh264":
                this.encoder = new Worker("video/openh264_encoder.js");
                break;
            default:
                throw "unknown encoder";
        }

        for (var i = 0; i < _this.nUserCount; ++i) {
            _this.decoder[i] = new Worker("video/openh264_decoder.js");

            switch (document.getElementById("renderer").value) {
                case "webgl":
                    _this.renderer[i] = new WebGLRenderer();
                    console.log("WebGL Renderer (YUV420->RGB conversion in shader)");
                    break;
                default:
                    _this.renderer[i] = new RGBRenderer();
                    console.log("Canvas.putImageData Renderer (YUV420->RGB conversion in asm.js)");
                    break;
            }

            _this.decoder[i].onmessage = function (ev) {
                //console.log('decoder_1.onmessage');
                var index = ev.data.index;

                if (!_this.renderer_initialized[index]) {
                    if (ev.data.buf instanceof Uint8Array)
                        return;

					var w = document.getElementById("dstWidth").value;
					var h = document.getElementById("dstHeight").value;

                    var width = _this.decoder_width = ev.data.width;
                    var height = _this.decoder_height = ev.data.height;
                    _this.canvas_dst[index].width = w;
                    _this.canvas_dst[index].height = h;

                    _this.renderer[index].init(_this.canvas_dst[index], width, height);
                    _this.renderer_initialized[index] = true;
                    return;
                }

                //--_this.decoder_queue;
                if (ev.data.buf.length == 1)
                    return;

				var yuv = ev.data.buf;

                if (_this.renderer[index].is_rgba()) {
                    _this.renderer[index].render(yuv, yuv, yuv);
                }
                else {
                    var s = _this.decoder_width * _this.decoder_height;
                    var y = yuv.subarray(0, s);
                    var u = yuv.subarray(s, s * 1.25);
                    var v = yuv.subarray(s * 1.25, s * 1.5);
                    _this.renderer[index].render(y, u, v);
                }
            }
            
        }

        this.showVideoSpeed = function () {
            var avg = _this.encoded_frames / (Date.now() - _this.encode_start_time) * 1000;
            var avg_bps = _this.encoded_bytes * 8 / (Date.now() - _this.encode_start_time) * 1000;
            if (Date.now() - _this.encode_period_time >= 1000) {
                var frames = _this.encoded_frames - _this.encoded_frames_period;
                var bytes = _this.encoded_bytes - _this.encoded_bytes_period;
                var period_time = Date.now() - _this.encode_period_time;
                var avg_period = frames / period_time * 1000;
                var avg_bps_period = bytes * 8 / period_time * 1000;
                _this.encoded_frames_period = _this.encoded_frames;
                _this.encoded_bytes_period = _this.encoded_bytes;
                _this.encode_period_time = Date.now();
                _this.status.innerHTML = avg_period.toFixed(2) + 'fps ' + (avg_bps_period / 1000).toFixed(0) +
                                        'kbps ' + (bytes * 8 / 1000 / frames).toFixed(0) +
                                        'kbit/frame ' + '(avg: ' + avg.toFixed(2) + 'fps ' + (avg_bps / 1000).toFixed(0) +
                                        'kbps ' + (_this.encoded_bytes * 8 / 1000 / _this.encoded_frames).toFixed(0) + 'kbit/frame)';
            }
        }

        this.SendEncVideoStream = function (buf) {//Send videostream to Server
            //console.log("Video Size:" + buf.byteLength + ":" + buf.length);

            //To do ......
            //buf.buffer, buf.byteLength -> server

            _this.RecvEncVideoStream(buf);
        }

        this.RecvEncVideoStream = function (buf) {//Recv videostream to Server
            var length = buf.length;

            for (var i = 0; i < _this.nUserCount; ++i) {
                var evdata1 = new Uint8Array(length);
                evdata1.set(buf);
                _this.decoder[i].postMessage(evdata1);
            }
        }

        this.SendEncAudioStream = function (buf) {//Send audio stream to Server
            if (_this.audioCodec) {
                var out_i16 = _this.audioCodec.encodeAudio(buf);
				//console.log("Enc Size: " + out_i16.byteLength + ":" + buf.byteLength);

                //To do ......
                //out_i16.buffer, out_i16.byteLength -> server

                _this.RecvEncAudioStream(out_i16);
            }
        }

        this.RecvEncAudioStream = function (buf) {//Recv audio stream to Server
            if (_this.audioCodec) {
                var out_i16 = _this.audioCodec.decodeAudio(buf);
                if (_this.audioRecorder)
                    _this.audioRecorder.importData(out_i16);
            }
        }

        this.encoder.onmessage = function (ev) {
            _this.encoded_frames++;

            if (ev.data.length > 1) {
                _this.encoded_bytes += ev.data.length;

                /*if (_this.audioRecorder)
				{					
                    _this.audioRecorder.exportData(_this.SendEncAudioStream);
				}
				*/
                _this.SendEncVideoStream(ev.data);
            }

            _this.showVideoSpeed();

            _this.queued_frames--;

            if (_this.queued_frames <= _this.max_queued_frames) {
                if (_this.timer_cleared) {
                    var delta = _this.videosrc.currentTime - _this.prev_video_time;

                    if (_this.target_interval <= delta) {
                        _this._frame_updated();
                        _this._wait_next_frame();
                    }
                    else {
                        _this._wait_next_frame(_this.target_interval - delta);
                    }
                }
            }

        }
    }

    VideoAudio.prototype.init = function () {
        var _this = this;

        for (var i = 0; i < _this.nUserCount; ++i) {
            _this.decoder[i].postMessage({ rgb: _this.renderer[i].is_rgba(), index: i });
        }

        _this.videosrc.autoplay = true;
        _this.videosrc.muted = true

        navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

        navigator.getUserMedia({ audio: true, video: true },
            function (strm) {
                var video = _this.videosrc;
                video.src = window.URL.createObjectURL(strm);

                var input = _this.audio_context.createMediaStreamSource(strm)
                var zeroGain = _this.audio_context.createGain();
                zeroGain.gain.value = 0;
                input.connect(zeroGain);
                zeroGain.connect(_this.audio_context.destination);
                _this.audioRecorder = new Recorder(input);
                _this.audioRecorder.clear();
				_this.audioRecorder.record();				
				_this.audioRecorder.audioUpdate(300, _this.SendEncAudioStream);
            },
            function (err) {
                console.log("failed(navigator.getUserMedia): " + err);
                return false;
            }
        );

        return true;
    };
    
    VideoAudio.prototype.run = function () {
        var _this = this;

        if (_this.init())
            _this._wait_video_init();
    };

    VideoAudio.prototype._wait_video_init = function () {
        var _this = this;
        window.setTimeout(function () {
            if (_this.videosrc.videoHeight == 0) {
                _this._wait_video_init();
            }
            else {
				var w = document.getElementById("srcWidth").value;
				var h = document.getElementById("srcHeight").value;

                //_this.canvas_src.width = parseInt(_this.videosrc.videoWidth * scale);
                //_this.canvas_src.height = parseInt(_this.videosrc.videoHeight * scale);

                _this.canvas_src.width = w;
                _this.canvas_src.height = h;

				_this.encoder.postMessage({
                    width: _this.canvas_src.width,
                    height: _this.canvas_src.height,
                    rgb: true,
                    x264: _this._get_x264_cfg(),
                    openh264: _this._get_openh264_cfg()
                });
                _this.encode_start_time = _this.encode_period_time = Date.now();
                _this._wait_next_frame();
            }
        }, 0);

    };
    VideoAudio.prototype._wait_next_frame = function (interval) {
        var _this = this;
        if (interval === void 0) { interval = undefined; }

        if (!this.timer_cleared) {
            return;
        }
        if (this.queued_frames > this.max_queued_frames) {
            this.timer_cleared = true;
            return;
        }
        this.timer_cleared = false;
        if (!interval)
            interval = this.target_interval;
        window.setTimeout(function () {
            if (_this.prev_video_time != _this.videosrc.currentTime) {
                _this.prev_video_time = _this.videosrc.currentTime;
                _this._frame_updated();
            }
            _this.timer_cleared = true;
            _this._wait_next_frame();
        }, interval);
    };

    VideoAudio.prototype._frame_updated = function () {
        if (this.queued_frames <= this.max_queued_frames) {
            this.canvas_src_ctx.drawImage(this.videosrc, 0, 0, this.videosrc.videoWidth, this.videosrc.videoHeight, 0, 0, this.canvas_src.width, this.canvas_src.height);
            var img = this.canvas_src_ctx.getImageData(0, 0, this.canvas_src.width, this.canvas_src.height);
            this.encoder.postMessage(img.data, [img.data.buffer]);
            this.queued_frames++;
        }
    };
    VideoAudio.prototype._get_x264_cfg = function () {
        var ret = {};
        ret["preset"] = document.getElementById("x264presets").value;
        ret["tune"] = document.getElementById("x264tune").value;
        switch (document.getElementById("x264rcmode").value) {
            case "quality":
                ret["crf"] = document.getElementById("x264quality").value;
                break;
            case "bitrate":
                ret["bitrate"] = document.getElementById("x264bitrate").value;
                break;
        }
        return ret;
    };
    VideoAudio.prototype._get_openh264_cfg = function () {
        return {
            "bitrate": parseInt(document.getElementById("openh264bitrate").value)
        };
    };
    return VideoAudio;
})();

document.addEventListener("DOMContentLoaded", function (event) {
    var videoAudio = 0;
    var encoder_changed = function () {
        var names = ["x264", "openh264"];
        var cfgs = [
            document.getElementById("x264cfg"),
            document.getElementById("openh264cfg")
        ];
        var selected_name = document.getElementById("encoder").value;
        for (var i = 0; i < names.length; ++i) {
            var value = (names[i] == selected_name ? "inline" : "none");
            if (cfgs[i])
                cfgs[i].style.display = value;
        }
    };
    var x264_mode_changed = function () {
        var modes = ["quality", "bitrate"];
        var cfgs = [
            document.getElementById("x264quality"),
            document.getElementById("x264bitrate")
        ];
        var selected_mode = document.getElementById("x264rcmode").value;
        for (var i = 0; i < modes.length; ++i) {
            var value = (modes[i] == selected_mode ? "inline" : "none");
            cfgs[i].style.display = value;
        }
    };

    videoAudio = new VideoAudio();

    document.getElementById("encoder").addEventListener("change", encoder_changed);
    document.getElementById("x264rcmode").addEventListener("change", x264_mode_changed);
    document.getElementById("start").addEventListener("click", function () {        
        videoAudio.run();
    });

    encoder_changed();
    x264_mode_changed();
});
