const BitrateIndex = {
  'V1,L1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  'V1,L2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  'V1,L3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  'V2,L1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  'V2,L2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  'V2,L3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}

const SampleIndex = [
  [ 11025, 12000, 8000 ],  // MPEG 2.5
  undefined,
  [ 22050, 24000, 16000 ], // MPEG 2
  [ 44100, 48000, 32000 ], // MPEG 1
];

class ID3 {
  constructor(file) {
    this.meta = {
      headerLen: 10
    };
    this.versionMajor = 3;
    this.versionMinor = 0;
    this.flags = {
      unsynchronisation: 0,
      extended: 0,
      experimental: 0,
      footer: 0
    };
    this.tagLength = -1;
    this.frames = {};
    this.file = file;
  }

  parseId3Header() {
    return new Promise((resolve, reject) => {
      readFile(this.file, 0, 10)
      .then(data => {
        //Check Sign
        if (data[0] !== 73 || data[1] !== 68 || data[2] !== 51) { //ID3
          if (data[0] !== 255 || data[1] < 224) {
            console.log('[Header] Invalid MP3 File');
            return reject('Invalid ID3 Header');
          } else {
            // No ID3 Tag, But possibly a MP3 File
            // Reference: http://www.mp3-tech.org/programmer/frame_header.html
            const versionActual = (data[1] >> 3) & 3;
            const version = (data[1] >> 3) & 1; // 0 is version 2, 1 is version 1
            const layer = (data[1] >> 1) & 3; // 01 - Layer 3, 10 - Layer 2, 11 - Layer 1
            const bitrateIndex = (data[2] >> 4) & 15;
            const sampleRate = (data[2] >> 2) & 3;

            const lookupIndex = `V${(version === 1) ? '1': '2'},L${4 - layer}`;
            const table = BitrateIndex[lookupIndex];
            if (table === undefined) {
              return reject('Not an MP3 File 1');
            } else if (bitrateIndex > 14) {
              return reject('Not an MP3 File 2');
            } else if (bitrateIndex === 0) {
              return reject('Not an MP3 File 3');
            }
            const bitrate = table[bitrateIndex];

            if (sampleRate >= 3 || sampleRate < 0) {
              return reject('Not an MP3 File 4');
            }

            const sampleTable = SampleIndex[versionActual];
            if (sampleTable === undefined) {
              return reject('Not an MP3 File 5');
            }
            const sampleFreq = sampleTable[sampleRate];
            const padding = (data[2] >> 1) & 1;

            const frameLen = Math.floor((144 * bitrate / sampleFreq) + padding);
            readFile(this.file, frameLen, 2)
            .then((data2) => {
              if (data2[0] !== 255 || data2[1] < 224) {
                return reject('Not an MP3 File 6');
              }

              // Init to defaults
              this.versionMajor = 2;
              this.versionMinor = 3;
              this.flags = buildEmptyFlags();
              this.tagLength = 0;
              resolve(this);
            });
          }
          return;
        }

        this.versionMajor = data[3];
        this.versionMinor = data[4];
        this.flags.unsynchronisation = (data[5] & 128) >> 7;
        this.flags.extended = (data[5] & 64) >> 6;
        this.flags.experimental = (data[5] & 32) >> 5;
        this.flags.footer = (data[5] & 16) >> 4;
        this.tagLength = readSynchSafeInt(data, 6);

        if (this.flags.unsynchronisation === 1) {
          console.warn('Unsynchronisation flag is set. Parser may not behave properly');
        }
        console.log(this);

        if (this.flags.extended === 1) {
          this.parseId3ExtendedHeader()
          .then(x => resolve(this));
        }
        resolve(this);
      });
    });
  }

  parseId3ExtendedHeader() {
    console.warn('ID3 Extended Header has not been tested');
    return new Promise(resolve => {
      readFile(this.file, 10, 6)
      .then(data => {
        let len;
        if (this.versionMajor >= 4) {
          len = readSynchSafeInt(data, 0);
        } else {
          len = readInt(data, 0);
        }
        const numFlagBytes = data[4];
        const extendedFlags = data[5];
        
        this.meta.headerLen += len + 6;

        readFile(this.file, 16, len - 6)
        .then(data2 => {
          this.parseId3ExtendedHeaderData(data2, numFlagBytes, extendedFlags);
          resolve(this);
        });
      });
    });
  }

  parseId3ExtendedHeaderData(data, numFlagBytes, extendedFlags) {
    console.log(data);
    console.log(numFlagBytes);
    console.log(extendedFlags);
    // Ignore because I cannot find a sample of this type of header
  }

  parseId3Body() {
    return new Promise((resolve, reject) => {
      if (this.tagLength < 0) {
        console.log('[Body] ID3 Header has not been parsed');
        return reject('ID3 Header has not been parsed'); 
      }

      if (this.tagLength > 0) {
        readFile(this.file, this.meta.headerLen, this.tagLength + 10)
        .then(data => {
          this.parseId3Frames(data);
          resolve(this);
        });
      } else {
        resolve(this);
      }
    });
  }
  
  parseId3Frames(data) {
    this.frames = {};
  
    let offset = 0;
    while (offset < data.length - 1) {
      let [frameLen, tag, frame] = parseId3Frame(data, offset, this.versionMajor);
      if (frameLen <= 10 || tag === undefined || frame === undefined) break;
      if (offset < 0) break;

      if (tag === 'TXXX' || tag === 'WXXX') { //Special case - Can have duplicated TXXX and WXXX
        if (tag in this.frames) {
          this.frames[tag].data.push(frame.data);
        } else {
          this.frames[tag] = {
            flags: frame.flags,
            data: [frame.data]
          };
        }
      } else {
        this.frames[tag] = frame;
      }
      
      offset += frameLen;
    }
  }

  getFrameData(tag) {
    if (tag in this.frames) {
      return this.frames[tag].data;
    }
    return undefined;
  }

  getFrameFlags(tag) {
    if (tag in this.frames) {
      return this.frames[tag].flags;
    }
    return undefined;
  }

  clone() {
    const ret = new ID3(this.file);
    ret.meta.headerLen = this.meta.headerLen;
    ret.versionMajor = this.versionMajor;
    ret.versionMinor = this.versionMinor;
    ret.flags = JSON.parse(JSON.stringify(this.flags));
    ret.tagLength = this.tagLength;

    return ret;
  }

  ingestFrame(tag, flags, data) {
    if (flags === undefined) {
      flags = buildEmptyFlags();
    }
    this.frames[tag] = {
      flags,
      data
    }
  }

  export() {
    return new Promise(resolve => {
      let finalFile = [73, 68, 51]; //ID3 Signature

      // Write Version
      finalFile.push(this.versionMajor);
      finalFile.push(this.versionMinor);

      // Write Flags
      let flag = 0;
      flag += ((this.flags.unsynchronisation === 1) ? 1 : 0) << 7;
      //flag += ((ID3Info["flags"]["extended"] == 1) ? 1 : 0) << 6; // Lets ignore extended headers
      flag += ((this.flags.experimental === 1) ? 1 : 0) << 5;
      flag += ((this.flags.footer === 1) ? 1 : 0) << 4;
      finalFile.push(flag);

      let frameDat = this.exportBody();
      finalFile = finalFile.concat(writeSynchSafeInt(frameDat.length)).concat(frameDat);

      readFile(this.file, this.tagLength + 10, this.file.length)
      .then(data => {
        let ID3Tag = new Uint8Array(finalFile);
        
        let c = new Int8Array(ID3Tag.length + data.length);
        c.set(ID3Tag);
        c.set(data, ID3Tag.length);
        
        resolve(c);
      })
    });
  }

  exportBody() {
    return Object.keys(this.frames).reduce((a, tag) => {
      const data = this.frames[tag];
      let writeStream = [];
      if (tag === 'TXXX' || tag === 'WXXX') { //Special case - Can have duplicated TXXX and WXXX
        data.data.forEach(x => {
          writeStream = writeStream.concat(writeId3Frame(tag, {flags: data.flags, data: x}, this.versionMajor));
        });
      } else {
        writeStream = writeId3Frame(tag, data, this.versionMajor);
      }

      return a.concat(writeStream);
    }, []);
  }
  
  static from(file) {
    return new Promise((resolve, reject) => {
      let ret = new ID3(file);
      ret.parseId3Header()
      .then(x => ret.parseId3Body())
      .then(() => resolve(ret))
      .catch(err => reject(err));
    });
  }
}

function buildEmptyFlags() {
  return {
    tagAlterPreserve: 0,
    fileAlterPreserve: 0,
    readOnly: 0,

    groupingIdentity: 0,
    compression: 0,
    encryption: 0,
    unsynchronisation: 0,
    dataLenIndicator: 0
  }
}

/////////////////  IO  ////////////////
let fileReader;
let readerBusy = false;
let IOQueue = [];

function readFile(file, start, len) {
  if (readerBusy) {
    return new Promise(resolve => {
      IOQueue.push([file, start, len, resolve]);
    });
  }

  //Is free
  if (fileReader === undefined) {
    fileReader = new FileReader();
  }

  return new Promise(resolve => {
    readerBusy = true;
    fileReader.onloadend = () => {
      readerBusy = false;
      const res = new Uint8Array(fileReader.result);
      resolve(res);

      if (IOQueue.length > 0) {
        const task = IOQueue.shift();
        readFile(task[0], task[1], task[2]).then(task[3]);
      }
    }
    let chunk = file.slice(start, len);
    fileReader.readAsArrayBuffer(chunk);
  });
}