var readShort, writeInt, writeSynchSafeInt, readVersionShort, writeString, writeDoubleWidthString, arrToString, encodeString, hasUtf16;
var id3Frames, encodings, encodingWidths;

var fileReader, curFile;

function writeMp3File(id3Data){
  var finalFile = [73, 68, 51]; //ID3 Signature
  
  //write version (ID3V2.3)
  finalFile.push(id3Data["version-major"]);
  finalFile.push(id3Data["version-minor"]);
  
  //write flag
  var flag = 0;
  flag += ((id3Data["flags"]["unsynchronisation"] == 1) ? 1 : 0) << 7;
  //flag += ((ID3Info["flags"]["extended"] == 1) ? 1 : 0) << 6; // Lets ignore extended headers
  flag += ((id3Data["flags"]["experimental"] == 1) ? 1 : 0) << 5;
  flag += ((id3Data["flags"]["footer"] == 1) ? 1 : 0) << 4;
  finalFile.push(flag);
  
  var frameDat = buildFrames(id3Data);
  finalFile = finalFile.concat(writeSynchSafeInt(frameDat.length)).concat(frameDat);
  
  fileReader.onload = function(){
    var res = new Uint8Array(fileReader.result);
    finalFile = new Uint8Array(finalFile);
    
    var c = new Int8Array(finalFile.length + res.length);
    c.set(finalFile);
    c.set(res, finalFile.length);
    
    var blobURL = window.URL.createObjectURL(new Blob([c], {type: "audio/mp3"}));
    document.getElementById("btn-download").style.display = "";
    document.getElementById("btn-download").href = blobURL;
    document.getElementById("btn-download").download = "new-song.mp3";
  }

  var chunk = curFile.slice(id3Data["tag-length"] + 10);
  fileReader.readAsArrayBuffer(chunk);
}

var Id3FrameWriters = {
  "COMM": writeCOMM,
  /*"UFID": writeUFID,
  "USLT": writeUSLT,
  "GEOB": writeGEOB,
  "PCNT": writePCNT,
  "POPM": writePOPM,
  "AENC": writeAENC,
  "USER": writeUSLT,
  "OWNE": writeOWNE*/
}

function buildFrames(id3Data){
  var ret = [];
  var tags = Object.keys(id3Data["frames"]);
  
  for(var i=0;i<tags.length;i++){
    var curTag = tags[i];
    var curTagDat = id3Data["frames"][tags[i]];
    
    console.log("Writing " + curTag);
    var curWriteStream = [curTag.charCodeAt(0),curTag.charCodeAt(1),curTag.charCodeAt(2),curTag.charCodeAt(3)];

    //Leave a space for size
    curWriteStream.push(0,0,0,0);
    
    //write flag
    var flag1 = 0;
    var flag2 = 0;
    
    flag1 += ((curTagDat["flags"]["tag-alter-preserve"] == 1) ? 1 : 0) << 6;
    flag1 += ((curTagDat["flags"]["file-alter-preserve"] == 1) ? 1 : 0) << 5;
    flag1 += ((curTagDat["flags"]["read-only"] == 1) ? 1 : 0) << 4;
    
    flag2 += ((curTagDat["flags"]["grouping-identity"] == 1) ? 1 : 0) << 6;
    flag2 += ((curTagDat["flags"]["compression"] == 1) ? 1 : 0) << 3;
    flag2 += ((curTagDat["flags"]["encryption"] == 1) ? 1 : 0) << 2;
    flag2 += ((curTagDat["flags"]["unsynchronisation"] == 1) ? 1 : 0) << 2;
    flag2 += ((curTagDat["flags"]["data-len-indicator"] == 1) ? 1 : 0);
    
    curWriteStream.push(flag1, flag2);
  
    var curData;
    
    if(curTag == "APIC"){
      curData = writeAPIC(curTagDat.data);
    }else if(curTag in Id3FrameWriters){
      curData = id3Data["frames"][curTag]["data"] = Id3FrameWriters[curTag](curTagDat.data);
    }else if(curTag[0] == "T"){
      curData = writeTextFrame(curTagDat.data);
    }else if(curTag[0] == "W"){
      if(curTag in id3Frames)
        curData = writeURLLinkFrame(curTagDat.data);
      else
        curData = writeCustomURLFrame(curTagDat.data);
    }else{
      //unknown frame, just dump data
      console.log("Unhandled frame " + curTag);
      curData = curTagDat.data;
    }
    
    if(curData != undefined){
      curWriteStream = curWriteStream.concat(curData);
    }
    
    //write data length
    var binDatLen;
    if(id3Data["version-major"] >= 4){
      binDatLen = writeSynchSafeInt(curData.length)
    }else{
      binDatLen = writeInt(curData.length)
    }
    curWriteStream[4] = binDatLen[0];
    curWriteStream[5] = binDatLen[1];
    curWriteStream[6] = binDatLen[2];
    curWriteStream[7] = binDatLen[3];
    
    ret = ret.concat(curWriteStream);
  }
  
  return ret;
}

function writeTextFrame(data){
  var ret = [0];
  
  if(hasUtf16(data.text)){
    ret[0] = 1; //UTF-16 with BOM
  }
  
  ret = ret.concat(encodeString(data.text, ret[0]));
  
  return ret;
}

function writeURLLinkFrame(data){
  return encodeString(data.url, 0);
}

function writeCustomURLFrame(data){
  var ret = [0];
  if(hasUtf16(data.desc)){
    ret[0] = 1; //UTF-16 with BOM
  }
  
  if(ret[0] == 0){
    ret = ret.concat(writeString(data.desc));
  }else{
    ret = ret.concat(writeDoubleWidthString(data.desc));
  }
  
  ret = ret.concat(encodeString(data.url, 0));

  return ret;
}

function writeAPIC(data){
  var ret = [0];
  
  if(hasUtf16(data.description)){
    ret[0] = 1; //UTF-16 with BOM
  }
  
  ret = ret.concat(writeString(data.mime));
  ret.push(data.picType);
  
  if(ret[0] == 0){
    ret = ret.concat(writeString(data.description));
  }else{
    ret = ret.concat(writeDoubleWidthString(data.description));
  }
  
  ret = ret.concat(Array.from(data.binary));

  return ret;
}

function writeUFID(data){
  
}

function writeUSLT(data){
  
}

function writeCOMM(data){
  var ret = [0];
  
  if(hasUtf16(data.desc) || hasUtf16(data.shortDesc)){
    ret[0] = 1; //UTF-16 with BOM
  }
  
  if(data.language.length != 3)
    console.log("WARNING: language length is not 3. Truncating / Padding");
  
  if(data.language.length >= 3){
    ret.push(data.language.charCodeAt(0), data.language.charCodeAt(1), data.language.charCodeAt(2));
  }else{
    var l = [0,0,0];
    for(var i=0;i<data.language.length;i++){
      l[i] = data.language.charCodeAt(i);
    }
    ret.push(l[0], l[1], l[2]);
  }
  if(ret[0] == 0){
    ret = ret.concat(writeString(data.shortDesc));
  }else{
    ret = ret.concat(writeDoubleWidthString(data.shortDesc));
  }
  ret = ret.concat(encodeString(data.desc, ret[0]));
  
  return ret;
  
}

function writeGEOB(data){
  
}

function writePCNT(data){
  
}

function writePOPM(data){
  
}

function writeAENC(data){
  
}

function writeOWNE(data){
  
}