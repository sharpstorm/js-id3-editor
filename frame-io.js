/* SECTION: READ HANDLERS */

function parseId3Frame(data, offset, versionMajor) {
  if (data[offset] === 0 && data[offset+1] === 0 && data[offset+2] === 0 && data[offset+3] === 0) //Invalid Frame
    return [0, undefined, undefined];
  
  let tag = [data[offset], data[offset+1], data[offset+2], data[offset+3]]
    .map(x => String.fromCharCode(x))
    .join('');

  console.log(tag);

  let ret = {}
  let frameLen;
  if (versionMajor >= 4) {
    frameLen = readSynchSafeInt(data, offset + 4);
  }else{
    frameLen = readInt(data, offset + 4);
  }
  
  //parse flags
  ret.flags = {
    tagAlterPreserve: data[offset+8] & 64,
    fileAlterPreserve: data[offset+8] & 32,
    readOnly: data[offset+8] & 16,

    groupingIdentity: data[offset+9] & 64,
    compression: data[offset+9] & 8,
    encryption: data[offset+9] & 4,
    unsynchronisation: data[offset+9] & 2,
    dataLenIndicator: data[offset+9] & 1
  }

  if (frameLen <= 0) {
    console.warn(`Tag ${tag} is 0 in length`);
  }
  
  if (tag in Id3FrameParsers) {
    ret.data = Id3FrameParsers[tag](data, offset + 10, frameLen);
  } else if(tag[0] === 'T') {
    ret.data = readTextFrame(data, offset + 10, frameLen);
  } else if(tag[0] === 'W') {
    ret.data = readURLLinkFrame(data, offset + 10, frameLen);
  } else {
    ret.data = data.slice(offset + 10, offset + 10 + frameLen);
  }
  
  return [frameLen + 10, tag, ret];
}

//Frame Readers (Follows ID3V2.4 Spec Order)

function readUFID(data, offset, frameLen) {
  let ret = {};
  ret.ownerId = decodeString(data, offset, offset + frameLen, 0);
  ret.binary = data.slice(offset + ret.ownerId.length + 1, offset + frameLen);
  
  return ret;
}

function readTextFrame(data, offset, frameLen) {
  let ret = {};
  ret.encoding = data[offset];
  ret.text = decodeString(data, offset + 1, offset + frameLen, ret.encoding);
  
  return ret;
}

function readTXXX(data, offset, frameLen) {
  let ret = {};
  ret.encoding = data[offset];
  ret.desc = decodeString(data, offset + 1, offset + frameLen, ret.encoding);
  ret.text = decodeString(data, offset + 1 + encodeString(ret.desc, ret.encoding).length, offset + frameLen, ret.encoding);

  return ret;
}

function readURLLinkFrame(data, offset, frameLen) {
  let ret = {}
  
  ret.url = decodeString(data, offset, 1, offset + frameLen, 0); // Defaults to ISO-8859-1 as per spec
  return ret;
}

function readWXXX(data, offset, frameLen) {
  let ret = {};

  ret.encoding = data[offset];
  ret.desc = decodeString(data, offset + 1, offset + frameLen, ret.encoding);
  ret.url = decodeString(data, offset + 1 + encodeString(ret.desc, ret.encoding).length, offset + frameLen, 0); // Always ISO-8859-1

  return ret;
}

function readUSLT(data, offset, frameLen) {
  let ret = {};
  
  ret.encoding = data[offset];
  ret.language = decodeString(data, offset + 1, offset + 4, 0);
  ret.contentDesc = decodeString(data, offset + 4, offset + frameLen, ret.encoding);
  ret.lyrics = decodeString(data, offset + 4 + encodeString(ret.contentDesc, ret.encoding).length, offset + frameLen, ret.encoding);
  
  return ret;
}

function readCOMM(data, offset, frameLen) {
  let ret = {};
  
  ret.encoding = data[offset];
  ret.language = decodeString(data, offset + 1, offset + 4, 0);
  ret.shortDesc = decodeString(data, offset + 4, offset + frameLen, ret.encoding);
  ret.desc = decodeString(data, offset + 4 + encodeString(ret.shortDesc, ret.encoding).length, offset + frameLen, ret.encoding);
  
  return ret;
}

function readAPIC(data, offset, frameLen) {
  let ret = {};

  let encoding = data[offset];
  ret.mime = decodeString(data, offset + 1, offset + frameLen, 0);
  ret.picType = data[offset + 2 + ret.mime.length];
  ret.description = decodeString(data, offset + 3 + ret.mime.length, offset + frameLen, encoding);

  let picBinaryPosition = offset + 3 + ret.mime.length + encodeString(ret.description, encoding).length;
  ret.binary = data.slice(picBinaryPosition, offset + frameLen);
  
  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function readGEOB(data, offset, frameLen){
  let ret = {};

  let encoding = data[offset];
  ret.mime = decodeString(data, offset + 1, offset + frameLen, 0);
  ret.fileName = decodeString(data, offset + 2 + ret.mime.length, offset + frameLen, encoding);
  ret.contentDesc = decodeString(data, offset + 2 + ret.mime.length + encodeString(ret.fileName, encoding).length, offset + frameLen, encoding);
  ret.binary = data.slice(offset + 2 + ret.mime.length + encodeString(ret.fileName, encoding).length + encodeString(ret.contentDesc, encoding).length, offset + frameLen);
  
  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function readPCNT(data, offset, frameLen){
  let ret = {};

  ret.count = 0;
  for (let i = 0; i < frameLen; i++) {
    ret.count += data[offset + 1] << ((frameLen - i - 1) * 8);
  }
  
  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function readPOPM(data, offset, frameLen){
  let ret = {};

  ret.email = decodeString(data, offset, offset + frameLen, 0);
  ret.rating = data[offset + 1 + ret.email.length];
  
  let remainLen = frameLen - 2 - ret.email.length
  ret.counter = 0;
  for (let i = 0; i < remainLen; i++) {
    ret.counter += data[offset + 1] << ((remainLen - i - 1) * 8);
  }
  
  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function readAENC(data, offset, frameLen){
  let ret = {};

  ret.owner = decodeString(data, offset, offset + frameLen, 0);
  ret.previewStart = readShort(data, offset + ret.owner.length + 1);
  ret.previewLength = readShort(data, offset + ret.owner.length + 3);
  ret.encryptionInfo = data.slice(offset + ret.owner.length + 5, offset + frameLen);

  return ret;
}

function readOWNE(data, offset, frameLen){
  let ret = {};
  
  ret.encoding = data[offset];
  ret.price = decodeString(data, offset + 1, offset + frameLen, 0);
  ret.dateOfPurch = decodeString(data, offset + 2 + ret.price.length, offset + 10 + ret.price.length, 0);
  ret.seller = decodeString(data, offset + 10 + ret.price.length, offset + frameLen, ret.encoding);

  return ret;
}

//Handler Definitions
const Id3FrameParsers = {
  'TXXX': readTXXX,
  'WXXX': readWXXX,
  'APIC': readAPIC,
  'UFID': readUFID,
  'USLT': readUSLT,
  'COMM': readCOMM,
  'GEOB': readGEOB,
  'PCNT': readPCNT,
  'POPM': readPOPM,
  'AENC': readAENC,
  'USER': readUSLT,
  'OWNE': readOWNE
}

/* SECTION: WRITE HANDLERS */

function writeId3Frame(tag, frame, versionMajor) {
  console.log('Writing ' + tag);

  let curWriteStream = [tag.charCodeAt(0), tag.charCodeAt(1), tag.charCodeAt(2), tag.charCodeAt(3)];
  curWriteStream.push(0,0,0,0); //Leave a space for size

  // Write flags
  let flag1 = 0;
  let flag2 = 0;
  
  flag1 += ((frame.flags.tagAlterPreserve === 1) ? 1 : 0) << 6;
  flag1 += ((frame.flags.fileAlterPreserve === 1) ? 1 : 0) << 5;
  flag1 += ((frame.flags.readOnly === 1) ? 1 : 0) << 4;
  
  flag2 += ((frame.flags.groupingIdentity === 1) ? 1 : 0) << 6;
  flag2 += ((frame.flags.compression === 1) ? 1 : 0) << 3;
  flag2 += ((frame.flags.encryption === 1) ? 1 : 0) << 2;
  flag2 += ((frame.flags.unsynchronisation === 1) ? 1 : 0) << 2;
  flag2 += ((frame.flags.dataLenIndicator === 1) ? 1 : 0);

  curWriteStream.push(flag1, flag2);

  let curData;
  if (tag in Id3FrameWriters) {
    curData = Id3FrameWriters[tag](tag, frame.data);
  } else if(tag[0] === 'T') {
    curData = writeTextFrame(tag, frame.data);
  } else if(tag[0] === 'W') {
    curData = writeURLLinkFrame(tag, frame.data);
  } else {
    console.warn('No defined writer: ' + tag);
    curData = frame.data;
  }

  if (curData !== undefined) {
    curWriteStream = curWriteStream.concat(curData);
  }

  let binDatLen;
  if (this.versionMajor >= 4) {
    binDatLen = writeSynchSafeInt(curData.length);
  } else {
    binDatLen = writeInt(curData.length);
  }
  curWriteStream[4] = binDatLen[0];
  curWriteStream[5] = binDatLen[1];
  curWriteStream[6] = binDatLen[2];
  curWriteStream[7] = binDatLen[3];

  return curWriteStream;
}

//Writer Definitions
const Id3FrameWriters = {
  'TXXX': writeTXXX,
  'WXXX': writeWXXX,
  'APIC': writeAPIC,
  'UFID': writeUFID,
  'USLT': writeUSLT,
  'COMM': writeCOMM,
  'GEOB': writeGEOB,
  'PCNT': writePCNT,
  'POPM': writePOPM,
  'AENC': writeAENC,
  'USER': writeUSLT,
  'OWNE': writeOWNE
}

// Frame Writers (Follows ID3V2.4 Spec Order)

function writeUFID(tag, data) {
  let ret = [];
  ret = ret.concat(encodeString(data.ownerId, 0));
  ret = ret.concat(data.binary);
  
  return ret;
}

function writeTextFrame(tag, data) {
  let encoding = hasUtf16(data.text) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.text, encoding, false));

  return ret;
}

function writeTXXX(tag, data) {
  let encoding = (hasUtf16(data.text) || hasUtf16(data.desc)) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.desc, encoding));
  ret = ret.concat(encodeString(data.text, encoding, false));

  return ret;
}

function writeURLLinkFrame(tag, data) {
  let ret = [];
  ret = ret.concat(encodeString(data.url, 0, false)); // Defaults to ISO-8859-1 as per spec

  return ret;
}

function writeWXXX(tag, data) {
  let encoding = hasUtf16(data.desc) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.desc, encoding));
  ret = ret.concat(encodeString(data.url, 0, false)); // Defaults to ISO-8859-1 as per spec

  return ret;
}

function writeUSLT(tag, data) {
  let encoding = (hasUtf16(data.contentDesc) || hasUtf16(data.lyrics)) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.language, 0, false));
  ret = ret.concat(encodeString(data.contentDesc, encoding));
  ret = ret.concat(encodeString(data.lyrics, encoding, false));
  
  return ret;
}

function writeCOMM(tag, data) {
  let encoding = (hasUtf16(data.shortDesc) || hasUtf16(data.desc)) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.language, 0, false));
  ret = ret.concat(encodeString(data.shortDesc, encoding));
  ret = ret.concat(encodeString(data.desc, encoding, false));
  
  return ret;
}

function writeAPIC(tag, data) {
  let encoding = hasUtf16(data.description) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.mime, 0));
  ret.push(data.picType & 255);
  ret = ret.concat(encodeString(data.description, encoding));
  ret = ret.concat(Array.from(data.binary));

  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function writeGEOB(tag, data) {
  let encoding = hasUtf16(data.description) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.mime, 0));
  ret = ret.concat(encodeString(data.fileName, encoding));
  ret = ret.concat(encodeString(data.contentDesc, encoding));
  ret = ret.concat(Array.from(data.binary));

  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function writePCNT(tag, data) {
  let ret = [];
  let ctr = data.count;

  while (ctr > 0) {
    ret.splice(0, 0, (ctr & 255));
    ctr = ctr >> 8;
  }
  
  return ret;
}

// NOT TESTED, ONLY IMPLEMENTED
function writePOPM(tag, data) {
  let ret = [];
  ret = ret.concat(encodeString(data.email, 0));
  ret.push(data.rating & 255);

  let ctr = data.counter;
  let ctrArr = [];
  while (ctr > 0) {
    ctrArr.splice(0, 0, (ctr & 255));
    ctr = ctr >> 8;
  }
  ret = ret.concat(ctrArr);

  return ret;
}


// NOT TESTED, ONLY IMPLEMENTED
function writeAENC(tag, data) {
  let ret = [];
  ret = ret.concat(encodeString(data.owner, 0));
  ret = ret.concat(writeShort(data.previewStart));
  ret = ret.concat(writeShort(data.previewLength));
  ret = ret.concat(Array.from(data.encryptionInfo));

  return ret;
}

function writeOWNE(tag, data) {
  let encoding = hasUtf16(data.description) ? 1 : 0;
  let ret = [encoding];
  ret = ret.concat(encodeString(data.price, 0));
  ret = ret.concat(encodeString(data.dateOfPurch, 0, false).slice(0, 8));
  ret = ret.concat(encodeString(data.seller, encoding, false));

  return ret;
}