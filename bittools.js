function readShort(data, offset){
  return (data[offset+1] & 255) + 
         ((data[offset] & 255) << 8);
}

function readInt(data, offset){
  return (data[offset+3] & 255) + 
         ((data[offset+2] & 255) << 8) +
         ((data[offset+1] & 255) << 16) +
         ((data[offset] & 255) << 24);
}

function writeInt(data){
  return [(data >> 24) & 255,
         (data >> 16) & 255,
         (data >> 8) & 255,
         data & 255];
}

function readString(data, offset, limit) { //null terminated, ISO-8859-1
  if (limit === undefined) {
    limit = data.length;
  }

  let ret = [];
  let curPos = 0;
  while (offset + curPos < limit && data[offset + curPos] !== 0) {
    ret.push(String.fromCharCode(data[offset + curPos]));
    curPos++;
  }
  return ret.join('');
}

function readUTF16(data, offset, limit, isBigEndian) {
  if (limit === undefined) {
    limit = data.length;
  }
  if (isBigEndian === undefined) {
    isBigEndian = true;
  }

  let ret = [];
  let curPos = 0;

  while (offset + curPos < limit && (data[offset + curPos] !== 0 || data[offset + curPos + 1] !== 0)) {

    let curPt = (!isBigEndian) ? ((data[offset + curPos + 1] << 8) + data[offset + curPos]) : ((data[offset + curPos] << 8) + data[offset + curPos + 1]);
    curPos += 2;

    if (curPt >= 55296) {
      // Read second 16bit surrogate
      let suppPt = (!isBigEndian) ? ((data[offset + curPos + 1] << 8) + data[offset + curPos]) : ((data[offset + curPos] << 8) + data[offset + curPos + 1]);
      curPos += 2;

      ret.push(String.fromCharCode(curPt, suppPt));
    } else {
      ret.push(String.fromCharCode(curPt));
    }
  }

  return ret.join('');
}

function readUTF8(data, offset, limit) {
  if (limit === undefined) {
    limit = data.length;
  }

  let ret = [];
  let curPos = 0;

  while (offset + curPos < limit && data[offset + curPos] !== 0) {
    let charCode;

    if (data[offset + curPos] < 128) {
      charCode = data[offset + curPos];
      curPos += 1;
    } else if (data[offset + curPos] < 224) {
      charCode = (data[offset + curPos + 1] & 63) + ((data[offset + curPos] & 31) << 6);
      curPos += 2;
    } else if (data[offset + curPos] < 240) {
      charCode = (data[offset + curPos + 2] & 63) + ((data[offset + curPos + 1] & 63) << 6) + ((data[offset + curPos] & 15) << 12);
      curPos += 2;
    } else {
      charCode = (data[offset + curPos + 3] & 63) + ((data[offset + curPos + 2] & 63) << 6) + ((data[offset + curPos + 1] & 63) << 12) + ((data[offset + curPos] & 7) << 18);
      curPos += 3;
    }
    ret.push(String.fromCharCode(charCode));
  }

  return ret.join('');
}

function writeString(data, terminated) { //null terminated, ISO-8859-1
  if (terminated === undefined) {
    terminated = true;
  }

  let ret = [];
  for (let i = 0; i < data.length; i++) {
    ret.push(data.charCodeAt(i));
  }
  if (terminated) {
    ret.push(0);
  }

  return ret;
}

function write16Bit(ret, code, isBigEndian) {
  if (!isBigEndian) {
    ret.push(code & 255);
    ret.push((code >> 8) & 255);
  } else {
    ret.push((code >> 8) & 255);
    ret.push(code & 255);
  }
}

function writeUTF16(data, isBigEndian, terminated) {
  if (isBigEndian === undefined) {
    isBigEndian = true;
  }
  if (terminated === undefined) {
    terminated = true;
  }
  
  let ret = [];

  for (let i = 0; i < data.length; i++) {
    let code = data.charCodeAt(i);
    

    if (code >= 65536) {
      let newCode = code - 65536;
      write16Bit(ret, ((newCode >> 10) & 1023) + 55296, isBigEndian);
      write16Bit(ret, (newCode & 1023) + 56320, isBigEndian);
    } else {
      write16Bit(ret, code, isBigEndian);
    }
  }
  if (terminated) {
    ret.push(0, 0);
  }
  return ret;
}

function writeUTF8(data, terminated) {
  if (terminated === undefined) {
    terminated = true;
  }

  let ret = [];

  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    if (code < 128) {
      ret.push(code);
    } else if (code < 2048) {
      ret.push(192 + ((code) >> 6));
      ret.push(128 + ((code) & 63));
    } else if (code < 65536) {
      ret.push(224 + (code >> 12));
      ret.push(128 + ((code >> 6) & 63));
      ret.push(128 + ((code) & 63));
    } else {
      ret.push(240 + (code >> 18));
      ret.push(128 + ((code >> 12) & 63));
      ret.push(128 + ((code >> 6) & 63));
      ret.push(128 + ((code) & 63));
    }
  }
  if (terminated) {
    ret.push(0);
  }
  return ret;
}

function writeDoubleWidthString(data){ //TODO: Deprecate
  var ret = [];
  for(var i=0;i<data.length;i++){
    var charCode = data.charCodeAt(i);
    ret.push(charCode & 255, (charCode >> 8) & 255);
  }
  ret.push(0, 0);

  return ret;
}

function decodeString(data, start, limit, encoding) {
  if (start === undefined) start = 0;
  if (limit === undefined) limit = data.length;
  if (encoding === undefined) encoding = 0;
  
  if (encoding === 0) { // ISO-8859-1
    return readString(data, start, limit);
  } else if (encoding === 1) { // UTF-16, BOM
    let bigEndian = true; //Assume BE

    if (data[start] === 255 && data[start + 1] === 254) {
      bigEndian = false;
      start += 2;
    } else if (data[start] === 254 && data[start + 1] === 255) {
      bigEndian = true;
      start += 2;
    }

    return readUTF16(data, start, limit, bigEndian);
  } else if (encoding === 2) {
    return readUTF16(data, start, limit, true);
  } else if (encoding === 3) {
    return readUTF8(data, start, limit);
  } else {
    return readString(data, start, limit);
  }
}

function encodeString(data, encoding, terminated) {
  if (encoding === undefined) {
    encoding = 0;
  }
  if (terminated === undefined) {
    terminated = true;
  }

  if (encoding === 0) { // ISO-8859-1
    return writeString(data, terminated);
  } else if (encoding === 1) { // UTF-16, BOM
    const ret = writeUTF16(data, true, terminated);
    ret.splice(0, 0, 254, 255);
    return ret;
  } else if (encoding === 2) {
    return writeUTF16(data, true), terminated;
  } else if (encoding === 3) {
    return writeUTF8(data, terminated);
  } else {
    return writeString(data, terminated);
  }
}

////////////////// Special functions //////////////////////

function readSynchSafeInt(data, offset){ //Ignore first bit of every number
  return (data[offset + 3] & 127) + 
         ((data[offset + 2] & 127) << 7) +
         ((data[offset + 1] & 127) << 14) +
         ((data[offset] & 127) << 21);
}

function writeSynchSafeInt(data){ //Ignore first bit of every number
  return [(data & 266338304) >> 21,
         (data & 2080768) >> 14,
         (data & 16256) >> 7,
         (data & 127)];
}

function hasUtf16(str) {
    for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 255) return true;
    }
    return false;
}