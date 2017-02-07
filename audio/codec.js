
(function (window) {
    var AudioCodec = function () {
        var _this = this;
        this.enc_InData = 0;
        this.enc_OutData = 0;
        this.dec_InData = 0;
        this.dec_OutData = 0;

        this.enc_inMemSize = 0;
        this.enc_outMemSize = 0;
        this.dec_inMemSize = 0;
        this.dec_outMemSize = 0;

        this.sleep = function (ms) {
            var unixtime_ms = new Date().getTime();
            while (new Date().getTime() < unixtime_ms + ms) { }
        }

        this.encAlloc = function (newSize) {
            try {
                if (!this.enc_InData) {
                    this.enc_InData = _malloc(newSize);
                    this.enc_inMemSize = newSize;
                }

                if (this.enc_inMemSize < newSize) {
                    if (this.enc_InData) {
                        _free(this.enc_InData);
                        this.enc_InData = 0;
                    }

                    this.enc_InData = _malloc(newSize);
                    this.enc_inMemSize = newSize;
                }

                var newSize = parseInt(newSize / 18) + 1;
                if (!this.enc_OutData) {
                    this.enc_OutData = _malloc(newSize);
                    this.enc_outMemSize = newSize;
                }

                if (this.enc_outMemSize < newSize) {
                    if (this.enc_OutData) {
                        _free(this.enc_OutData);
                        this.enc_OutData = 0;
                    }

                    this.enc_OutData = _malloc(newSize);
                    this.enc_outMemSize = newSize;
                }
            } catch (e) {
                console.log(e);
            }
        }

        this.decAlloc = function (newSize) {
            try {
                if (!this.dec_InData) {
                    this.dec_InData = _malloc(newSize);
                    this.dec_inMemSize = newSize;
                }

                if (this.dec_inMemSize < newSize) {
                    if (this.dec_InData) {
                        _free(this.dec_InData);
                        this.dec_InData = 0;
                    }

                    this.dec_InData = _malloc(newSize);
                    this.dec_inMemSize = newSize;
                }

                newSize = newSize * 30;
                if (!this.dec_OutData) {
                    this.dec_OutData = _malloc(newSize);
                    this.dec_outMemSize = newSize;
                }

                if (this.dec_outMemSize < newSize) {
                    if (this.dec_OutData) {
                        _free(this.dec_OutData);
                        this.dec_OutData = 0;
                    }

                    this.dec_OutData = _malloc(newSize);
                    this.dec_outMemSize = newSize;
                }
            } catch (e) {
                console.log(e);
            }
        }

        this.encodeAudio = function (inArray16) {
            var srclength = inArray16.byteLength;

            this.encAlloc(srclength);

            _g723_Encode_Init();
            var in_i16 = HEAPU16.subarray(this.enc_InData >> 1, (this.enc_InData + srclength) >> 1);
            in_i16.set(inArray16);

            var dstlength = _g723_Encode(this.enc_InData, srclength, this.enc_OutData);

            var out_i16 = HEAPU16.subarray(this.enc_OutData >> 1, (this.enc_OutData + dstlength) >> 1);

            return new Uint16Array(out_i16);
        }

        this.decodeAudio = function (inArray16) {
            var srclength = inArray16.byteLength;

            this.decAlloc(srclength);

            _g723_Decode_Init();
            var in_i16 = HEAPU16.subarray(this.dec_InData >> 1, (this.dec_InData + srclength) >> 1);
            in_i16.set(inArray16);

            var dstlength = _g723_Decode(this.dec_InData, srclength, this.dec_OutData);

            var out_i16 = HEAPU16.subarray(this.dec_OutData >> 1, (this.dec_OutData + dstlength) >> 1);

            return new Uint16Array(out_i16);
        }
    }

    window.AudioCodec = AudioCodec;

})(window);
