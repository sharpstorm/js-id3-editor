let curFile;
let ID3Info;
let saveHandlers = {};

const emptyGIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const emptyGIFBinary = [71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,255,255,255,33,
                     249,4,1,10,0,1,0,44,0,0,0,0,1,0,1,0,0,2,2,76,1,0,59];

//string consts
const CONST_V23_WARN = '(V2.3 Only)';
const CONST_V24_WARN = '(V2.4 Only)';

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('upload-file-input').addEventListener('change', (evnt) => {
    const selectedFile = evnt.target.files[0];
    if (selectedFile !== undefined) {
      curFile = selectedFile;
      document.getElementById('upload-file-name-label').textContent = curFile.name;
    } else {
      curFile = undefined;
      document.getElementById('upload-file-name-label').textContent = "Choose file...";
    }
  });
  
  document.getElementById('btn-upload').onclick = () => {
    ID3.from(curFile)
    .then(result => {
      ID3Info = result;
      showId3InfoUi();
    });
  }
  
  document.getElementById('btn-add-tag').onclick = () => {
    const container = document.getElementById('table-available-tags');

    while (container.lastChild) {
      container.removeChild(container.lastChild);
    }

    const tbl = document.getElementById('editor-tags');
    let curTags = [];
    for (let i = 1; i < tbl.children.length; i++) { //0 is version
      curTags.push(tbl.children[i].getAttribute('data-tag'));
    }

    Object.keys(id3Frames)
      .concat(Object.keys(newTags))
      .concat(Object.keys(legacyTag))
      .forEach(tag => {
        if (curTags.includes(tag)) return;
        //only allow adding certain
        if (tag[0] !== 'T' && tag[0] !== 'W' && tag !== 'APIC' && tag !== 'COMM') return;

        let tagName;
        if (tag in id3Frames) {
          tagName = id3Frames[tag];
        } else if(tag in legacyTag) {
          tagName = createElement('span', {}, 
            legacyTag[tag],
            createElement('span', {className: 'note-strong'}, ' ' + CONST_V23_WARN)
          );
        } else if(tag in newTags) {
          tagName = createElement('span', {}, 
            newTags[tag],
            createElement('span', {className: 'note-strong'}, ' ' + CONST_V24_WARN)
          );
        }
        const row = createElement('tr', {}, 
          createElement('td', {}, tagName),
          createElement('td', {}, tag),
          createElement('td', {}, 
            createElement('button', {
              className: 'btn btn-primary', 
              attributes: {'data-tag': tag},
              eventListener: {click: addNewTag}
            }, 'Add')
          )
        );
        container.appendChild(row);
      });

    $('#new-tag-modal').modal('show');
  }
  
  document.getElementById('btn-save').onclick = () => {
    const clone = parseUITags();
    if (clone === undefined) {
      return;
    }

    clone.export().then(data => {
      const blobURL = window.URL.createObjectURL(new Blob([data], {type: "audio/mp3"}));
      document.getElementById('btn-download').style.display = '';
      document.getElementById('btn-download').href = blobURL;
      document.getElementById('btn-download').download = 'new-song.mp3';
      document.getElementById('btn-save').style.display = 'none';
    });
  }
});

function showId3InfoUi() {

  document.getElementById('app').classList.add('editor');
  const blob = window.URL || window.webkitURL;

  if (!blob) {
    alert('Your browser does not support Blob URLs :(');
    return;
  }else{
    document.getElementById('editor-player').src = blob.createObjectURL(curFile); 
  }
  
  const container = document.getElementById('editor-tags');
  
  const [verRow, saveHandler] = buildVersionRow(ID3Info.versionMajor);
  saveHandlers['VERSION'] = saveHandler;
  verRow.setAttribute('data-tag', 'VERSION');
  container.appendChild(verRow);
  
  Object.keys(ID3Info.frames)
    .forEach(frameId => {
      const [row, saveHandler] = resolveBuildRow(frameId, ID3Info.frames[frameId]);
      if (row !== undefined) {
        container.appendChild(row);
        saveHandlers[frameId] = saveHandler;
      }
    });
    
  document.getElementById('upload-pane').classList.remove('active');
  document.getElementById('editor-pane').classList.add('active');
}

const specialRowBuilders = {
  'TXXX': buildTXXX,
  'WXXX': buildWXXX,
  'APIC': buildImageRow,
  'COMM': buildCOMM,
  'GEOB': buildGEOB,
  'PCNT': buildPCNT,
  'POPM': buildPOPM,
  'AENC': buildAENC,
  'USLT': buildUSLT,
  'USER': buildUSER,
  'OWNE': buildOWNE
};

function resolveBuildRow(frameId, frameObj, disabled) {
  let tagName = undefined;
  
  if (frameId in id3Frames) {
    tagName = id3Frames[frameId];
  } else {
    if (frameId in legacyTag) {
      tagName = createElement('span', {}, 
        legacyTag[frameId],
        createElement('span', {className: 'note-strong'}, ' ' + CONST_V23_WARN)
      );
    } else if (frameId in newTags) {
      tagName = createElement('span', {}, 
        newTags[frameId],
        createElement('span', {className: 'note-strong'}, ' ' + CONST_V24_WARN)
      );
    }
  }

  tagName = (tagName === undefined) ? frameId : tagName;

  let row, saveHandler;
  if (frameId in specialRowBuilders) {
    [row, saveHandler] = specialRowBuilders[frameId](tagName, frameObj.data, disabled);
  } else if (frameId[0] === 'T') {
    [row, saveHandler] = buildTextRow(tagName, frameObj.data.text, disabled);
  } else if (frameId[0] === 'W') {
    [row, saveHandler] = buildUrlRow(tagName, frameObj.data.url, frameObj.data.desc, disabled);
  } else {
    [row, saveHandler] = buildStaticRow(tagName, frameObj, disabled);
  }

  if (row !== undefined) {
    row.setAttribute('data-tag', frameId);
  }
  return [row, saveHandler];
}

function deleteTagRow() {
  const tag = this.parentElement.parentElement.getAttribute('data-tag');
  if (tag === 'VERSION') {
    alert('You cannot delete version!');
    return;
  }
  delete saveHandlers[tag];
  this.parentElement.parentElement.parentElement.removeChild(this.parentElement.parentElement);
}

function addNewTag() {
  const tag = this.getAttribute('data-tag');
  let dummyData = {};
  if (tag === 'APIC') {
    dummyData.mime = 'image/gif';
    dummyData.picType = 0;
    dummyData.description = '';
    dummyData.binary = Uint8Array.from(emptyGIFBinary);

  } else if (tag === 'COMM') {
    dummyData.encoding = 0;
    dummyData.language = 'eng';
    dummyData.shortDesc = '';
    dummyData.desc = '';

  } else if (tag === 'TXXX' || tag === 'WXXX') {
    dummyData = [];
  } else if (tag[0] === 'T') {
    dummyData.text = '';

  } else if (tag[0] === 'W') {
    dummyData.url = '';
  }

  const [row, saveHandler] = resolveBuildRow(tag, {'data': dummyData});
  if (row !== undefined) {
    document.getElementById('editor-tags').appendChild(row);
    saveHandlers[tag] = saveHandler;
  }

  $('#new-tag-modal').modal('hide');
}

function buildStandardRow(tn) {
  let tagName = createElement('td', {}, tn);
  let tagContent = createElement('td', {});
  let row = createElement('tr', {}, 
    tagName,
    tagContent,
    createElement('td', {},
      createElement('button', {className: 'btn btn-danger', eventListener: {
        click: deleteTagRow
      }}, 'Delete')
    )
  );

  return [row, tagName, tagContent];
}

function buildImageRow(name, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(name);

  const curImgView = createElement('a', {className: 'nav-link active'}, 'Image');
  const newImgView = disabled ? undefined : createElement('a', {className: 'nav-link tab-custom'}, 'Change Image');
  tagContent.appendChild(buildNavBar([curImgView, newImgView]));
  
  const img = createElement('img', {
    style: {
      width: 'calc(100% - 16px)',
      margin: '8px'
    },
    src: 'data:' + data.mime + ";base64, " + _arrayBufferToBase64(data.binary)
  });

  const img2 = createElement('img', { //img2
    style: {
      width: 'calc(100% - 16px)',
      margin: '8px',
      display: 'none'
    },
    src: emptyGIF
  });

  const imgContainer = createElement('div', {}, img, img2);
  const cancelBtn = createElement('button', {className: 'btn btn-danger', style: {display: 'none'}}, 'Cancel');
  const inpType = createElement.apply(null, ['select', { className: 'form-control', disabled }].concat(pictureTypes.map(x => createElement('option', {}, x))));
  inpType.selectedIndex = data.picType;
  const inpDesc = createElement('textarea', {className: 'form-control', value: data.description, disabled});

  const inputDiv = createElement('div', {style:{marginTop: '12px'}},
    buildRowGroup('Type', inpType),
    buildRowGroup('Desc', inpDesc),
    cancelBtn
  );

  const viewerWindow = createElement('div', {className: 'tab-window'}, 
    createElement('div', {}, //curImgWindow
      createElement('div', {className: 'container-fluid'}, //con
        buildRow([["col-5", imgContainer], ["col-7", inputDiv]])
      )
    )
  );
  tagContent.appendChild(viewerWindow);

  if (!disabled) {
    curImgView.onclick = () => {
      if(img2.src != emptyGIF){
        img.style.display = '';
        img2.style.display = 'none';
        cancelBtn.style.display = 'none';
        newImgView.classList.remove('active');
        curImgView.classList.add('active');
      }
      //not loaded, dont do anything
    }
    
    let changeBtn = createElement('input', { type: 'file', style: {display: 'none'} }, 'Change');
    document.body.appendChild(changeBtn);
    
    changeBtn.addEventListener('change', (evnt) => {
      let selectedFile = evnt.target.files[0];
      if (selectedFile !== undefined) {
        let fr = new FileReader();
        fr.onload = function() {
          img2.src = fr.result;
          img2.style.display = '';
          cancelBtn.style.display = '';
          img.style.display = 'none';
          
          curImgView.classList.remove('active');
          newImgView.classList.add('active');
          //newImgView.innerHTML = 'New Image';
          cancelBtn.style.display = '';
        };
        fr.readAsDataURL(selectedFile);
      }
    });
    
    newImgView.onclick = () => {
      if (img2.src !== emptyGIF) {
        img2.style.display = '';
        cancelBtn.style.display = '';
        img.style.display = 'none';
        
        curImgView.classList.remove('active');
        newImgView.classList.add('active');
      }else{
        changeBtn.click();
      }
    }
    
    cancelBtn.onclick = () => {
      cancelBtn.style.display = 'none';
      newImgView.textContent = 'Change Image';
      changeBtn.value = '';
      
      img.style.display = '';
      img2.style.display = 'none';
      img2.src = emptyGIF;

      newImgView.classList.remove('active');
      curImgView.classList.add('active');
    }
  }
    
  return [row, () => {

    const description = inpDesc.value;
    const picType = inpType.selectedIndex;
    const selectedSrc = (img2.src === emptyGIF) ? img.src : img2.src;
    const mime = base64MimeType(selectedSrc);
    const hexDat = selectedSrc.replace(/^data:image\/\w+;base64,/, '');
    const binary = b64toBlob(hexDat);

    return {
      binary,
      description,
      mime,
      picType
    }
  }];
}

function buildVersionRow(data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow('Version');

  const tb = createElement('select', {className: 'form-control', disabled}, 
    createElement('option', {}, 'ID3 v2.3'),
    createElement('option', {}, 'ID3 v2.4')
  );
  
  if (data === 3) {
    tb.selectedIndex = 0;
  } else if(data === 4) {
    tb.selectedIndex = 1;
  }
  
  tagContent.appendChild(tb);
  
  return [row, () => (tb.selectedIndex === 0) ? 3 : 4];
}

function buildTextRow(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inp = createElement('input', {type: 'text', className: 'form-control', value: data, disabled});
  tagContent.appendChild(inp);
  
  return [row, () => ({
    text: inp.value
  })];
}

function buildMultirow(tn, data, disabled, readAdapter, saveAdapter) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);

  const container = createElement('ul', {className: 'list-group list-group-flush'});
  let savers = [];

  const makeRow = (desc, text) => {
    let inpDesc = createElement('input', {type: 'text', className: 'form-control', value: desc, disabled});
    let inpText = createElement('input', {type: 'text', className: 'form-control', value: text, disabled});
    let btnDel = createElement('button', {className: 'btn btn-danger'}, 'Remove');
    const itemRow = createElement('li', {className: 'list-group-item'},
      buildRowGroup('Description', inpDesc),
      buildRowGroup('Content', inpText),
      btnDel
    );
    const saver = () => saveAdapter(inpDesc.value, inpText.value);

    container.appendChild(itemRow);
    savers.push(saver);

    btnDel.onclick = () => {
      container.removeChild(itemRow);
      savers.splice(savers.indexOf(saver), 1);
    };
  }

  data.forEach(item => {
    readAdapter(makeRow, item);
  });
  const btnAdd = createElement('button', {className: 'btn btn-secondary', style: {width: '100%', marginTop: '8px'}}, 'Add');
  btnAdd.onclick = () => makeRow('', '');

  tagContent.appendChild(container);
  tagContent.appendChild(btnAdd);

  return [row, () => savers.map(x => x())];
}

function buildTXXX(tn, data, disabled) {
  return buildMultirow(tn, data, disabled, 
    (x, item) => x(item.desc, item.text), 
    (desc, text) => ({desc, text})
  );
}

function buildWXXX(tn, data, disabled) {
  return buildMultirow(tn, data, disabled, 
    (x, item) => x(item.desc, item.url), 
    (desc, url) => ({desc, url})
  );
}

function buildUrlRow(tn, data, desc, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpUrl = createElement('input', {type: 'url', className: 'form-control', value: data, disabled});
  const inpDesc = createElement('textarea', {type: 'text', className: 'form-control', value: (desc === undefined) ? '' : desc, disabled});

  tagContent.appendChild(inpUrl);
  tagContent.appendChild(inpDesc);
  
  return [row, () => ({
    url: inpUrl.value,
    desc: inpDesc.value
  })];
}

function buildCOMM(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpLang = createElement('input', {type: 'text', className: 'form-control', value: data.language, disabled});
  const inpShortDesc = createElement('textarea', {className: 'form-control', value: data.shortDesc, disabled});
  const inpDesc = createElement('textarea', {className: 'form-control', value: data.desc, disabled});

  tagContent.appendChild(buildRowGroup('Language', inpLang));
  tagContent.appendChild(buildRowGroup('Short Desc', inpShortDesc));
  tagContent.appendChild(buildRowGroup("Desc", inpDesc));

  return [row, () => ({
    language: inpLang.value,
    shortDesc: inpShortDesc.value,
    desc: inpDesc.value
  })];
}

function buildGEOB(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpDesc = createElement('textarea', {className: 'form-control', value: data.contentDesc, disabled});

  const con = createElement('div', {className: 'container-fluid'}, 
    createElement(buildRow([
      ['col-4', 'Mime Type'], 
      ['col-8', createElement('div', {}, data.mime)]
    ])),
    createElement(buildRow([['col-4', 'Description'], ['col-8', inpDesc]])),
    createElement(buildRow([
      ['col-4', 'Download File'], 
      ['col-8', createElement('button', {
        className: 'form-control', 
        value: data.contentDesc,
        eventListener: {
          click: () => {
            const blob = new Blob(data.binary);
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank');
          }
        }
      }, 'Download')]
    ]))
  );

  tagContent.appendChild(con);
  
  return [row, () => ({
    mime: data.mime,
    contentDesc: inpDesc.value,
    binary: data.binary
  })];
}

function buildPCNT(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpCount = createElement('input', {type: 'number', className: 'form-control', value: data.count, disabled});
  tagContent.appendChild(inpCount);
  
  return [row, () => ({
    count: inpCount.value
  })];
}

function buildPOPM(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);

  const inpEmail = createElement('input', {type: 'text', className: 'form-control', value: data.email, disabled});
  const inpRating = createElement('input', {className: 'form-control', type: 'number', value: data.rating, disabled});
  const inpCounter = createElement('input', {className: 'form-control', type: 'number', value: data.counter, disabled});

  const con = createElement('div', {className: 'container-fluid'}, 
    buildRow([['col-4', 'Email'], ['col-8', inpEmail]]),
    buildRow([['col-4', 'Rating'], ['col-8', inpRating]]),
    buildRow([['col-4', 'Counter'], ['col-8', inpCounter]])
  );
  tagContent.appendChild(con);
  
  return [row, () => ({
    email: inpEmail.value,
    rating: inpRating.value,
    counter: inpCounter.value
  })];
}

function buildAENC(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpOwner = createElement('input', {type: 'text', className: 'form-control', value: data.owner, disabled});
  const inpPreviewStart = createElement('input', {className: 'form-control', type: 'number', value: data.previewStart, disabled});
  const inpPreviewLen = createElement('div', {className: 'form-control', type: 'number', value: data.previewLength, disabled});
  
  const con = createElement('div', {className: 'container-fluid'}, 
    buildRow([['col-4', 'Owner'], ['col-8', inpOwner]]),
    buildRow([['col-4', 'Preview Start'], ['col-8', inpPreviewStart]]),
    buildRow([['col-4', 'Preview Length'], ['col-8', inpPreviewLen]]),
    buildRow([['col-12', 'Encryption Info'], ['col-12', buildHexView(data.encryptionInfo)]]),
    buildHexView(data.encryptionInfo)
  );
  tagContent.appendChild(con);
  
  return [row, () => ({
    owner: inpOwner.value,
    previewStart: inpPreviewStart.value,
    previewLength: inpPreviewLen.value,
    encryptionInfo: data.encryptionInfo
  })];
}

function buildUSLT(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpLang = createElement('input', {type: 'text', className: 'form-control', value: data.language, disabled});
  const inpContentDesc = createElement('input', {type: 'text', className: 'form-control', value: data.contentDesc, disabled});
  const inpLyrics = createElement('textarea', {className: 'form-control', value: data.lyrics, disabled});
  
  const con = createElement('div', {className: 'container-fluid'}, 
    buildRowGroup('Language', inpLang),
    buildRowGroup('Content Description', inpContentDesc),
    buildRowGroup('Lyrics', inpLyrics)
  );
  tagContent.appendChild(con);
  
  return [row, () => ({
    language: inpLang.value,
    contentDesc: inpContentDesc.value,
    lyrics: inpLyrics.value
  })];
}

function buildUSER(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpLang = createElement('input', {type: 'text', className: 'form-control', value: data.language, disabled});
  const inpTerms = createElement('textarea', {className: 'form-control', value: data.contentDesc, disabled});
  
  const con = createElement('div', {className: 'container-fluid'}, 
    buildRowGroup('Language', inpLang),
    buildRowGroup('Terms', inpTerms)
  );
  tagContent.appendChild(con);
  
  return [row, () => ({
    language: inpLang.value,
    contentDesc: inpTerms.value,
    lyrics: ''
  })];
}

function buildOWNE(tn, data, disabled) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);
  const inpPrice = createElement('input', {type: 'text', className: 'form-control', value: data.price, disabled});
  const inpDateOfPurch = createElement('input', {type: 'text', className: 'form-control', value: data.dateOfPurch, disabled});
  const inpSeller = createElement('input', {type: 'text', className: 'form-control', value: data.seller, disabled});

  const con = createElement('div', {className: 'container-fluid'}, 
    buildRow([['col-4', 'Price'], ['col-8', inpPrice]]),
    buildRow([['col-4', 'Date Of Purchase'], ['col-8', inpDateOfPurch]]),
    buildRow([['col-4', 'Seller'], ['col-8', inpSeller]])
  );
  tagContent.appendChild(con);
  
  return [row, () => ({
    price: inpPrice.value,
    dateOfPurch: inpDateOfPurch.value,
    seller: inpSeller.value
  })];
}

function buildStaticRow(tn, data) {
  const [row, tagHeader, tagContent] = buildStandardRow(tn);

  let hexWindow = buildHexView(data.data);
  let textWindow = createElement('div', {style:{display: 'none'}}, decodeString(data.data));
  let viewerWindow = createElement('div', {className: 'tab-window'}, 
    hexWindow,
    textWindow
  );

  const hexView = createElement('a', {className: 'nav-link active'}, 'Hex');
  const textView = createElement('a', {className: 'nav-link'}, 'Text');
  
  hexView.onclick = () => {
    hexWindow.style.display = 'block';
    textWindow.style.display = 'none';
    textView.classList.remove('active');
    hexView.classList.add('active');
  }
  
  textView.onclick = () => {
    hexWindow.style.display = 'none';
    textWindow.style.display = 'block';
    textView.classList.add('active');
    hexView.classList.remove('active');
  }
  
  tagContent.appendChild(buildNavBar([hexView, textView]));
  tagContent.appendChild(viewerWindow);
  
  return [row, () => ({
    data: data.data
  })];
}

function parseUITags() {
  document.getElementById('lbl-export-warn').style.display = 'none';
  let tbl = document.getElementById('editor-tags');

  //Do a quick validation
  let legacyPresent = false;
  let newPresent = false;
  let version = saveHandlers['VERSION']();

  const tags = Object.keys(saveHandlers);
  tags.forEach(tag => {
    //Version checking
    if (tag in newTags) {
      newPresent = true;
    } else if(tag in legacyTag) {
      legacyPresent = true;
    }
  });

  if (newPresent && legacyPresent) {
    document.getElementById('lbl-export-warn').textContent = 'Conflicting Tags found. Both V2.3 and V2.4 present';
    document.getElementById('lbl-export-warn').style.display = '';
    return;
  } else if(version === 3 && newPresent) {
    document.getElementById('lbl-export-warn').textContent = 'Selected version is v2.3 but v2.4 tags found';
    document.getElementById('lbl-export-warn').style.display = '';
    return;
  } else if(version === 4 && legacyPresent) {
    document.getElementById('lbl-export-warn').textContent = 'Selected version is v2.4 but v2.3 tags found';
    document.getElementById('lbl-export-warn').style.display = '';
    return;
  }

  const clone = ID3Info.clone();
  document.getElementById('editor-tags').style.display = 'none';
  document.getElementById('btn-add-tag').style.display = 'none';
  const confirmTagTable = document.getElementById('confirm-tags');
  confirmTagTable.style.display = '';

  clone.versionMinor = 0;
  clone.versionMajor = saveHandlers['VERSION']();

  Object.keys(saveHandlers).forEach(tag => {
    if (tag === 'VERSION') {
      return;
    }

    const handler = saveHandlers[tag];
    const flags = ID3Info.getFrameFlags(tag);
    
    clone.ingestFrame(tag, flags, handler());
  });

  const [verRow, saveHandler] = buildVersionRow(clone.versionMajor, true);
  verRow.setAttribute('data-tag', 'VERSION');
  confirmTagTable.appendChild(verRow);
  
  Object.keys(clone.frames)
    .forEach(frameId => {
      const [row, saveHandler] = resolveBuildRow(frameId, clone.frames[frameId], true);
      if (row !== undefined) {
        confirmTagTable.appendChild(row);
      }
    });

  console.log(clone);
  return clone;
}

//////////////// HELPERS /////////////////////

function buildNavBar(items) {
  const nav = createElement('ul', {className: 'nav nav-tabs'});
  for (let i = 0; i < items.length; i++) {
    nav.appendChild(createElement('li', {className: 'nav-item'}, items[i]));
  }
  
  return nav;
}

function buildHexView(data){
  var hexWindow = document.createElement("div");
  hexWindow.className = "hex-view container-fluid"
  var titleView = document.createElement("div");
  titleView.className = "row"
  var spacer = document.createElement("div");
  spacer.className = "col-1";
  titleView.appendChild(spacer);
  var hexCol = document.createElement("div");
  hexCol.className = "col-11";
  hexCol.innerHTML = "0 &nbsp;1 &nbsp;2 &nbsp;3 &nbsp;4 &nbsp;5 &nbsp;6 &nbsp;7 &nbsp;8 &nbsp;9 &nbsp;A &nbsp;B &nbsp;C &nbsp;D &nbsp;E &nbsp;F";
  titleView.appendChild(hexCol);
  titleView.style.borderBottom = "#CCC solid 1px";
  hexWindow.appendChild(titleView);
  
  
  for(var i=0;i<data.length;i+=16){
    var contentView = document.createElement("div");
    contentView.className = "row";
    var rowCount = document.createElement("div");
    rowCount.className = "col-1 row-count";
    rowCount.innerHTML = (i/16).toString(16);
    
    var contentCol = document.createElement("div");
    contentCol.className = "col-11";
    var hexStr =  ""
    contentView.appendChild(rowCount);
    contentView.appendChild(contentCol);
    
    for(var j=i;j<i+16 && j < data.length;j++){
      var h = data[j].toString(16).toUpperCase();
      hexStr += ((h.length == 1) ? "0" + h : h) + " ";
    }
    contentCol.innerHTML = hexStr;
    hexWindow.appendChild(contentView);
  }
  
  return hexWindow;
}

function buildRow(contents) {
  let row = createElement('div', {className: 'row'});
  
  for (let i = 0; i < contents.length; i++) {
    let col = createElement('div', {className: contents[i][0]});

    if (typeof contents[i][1] === 'string') {
      col.textContent = contents[i][1];
    } else if (typeof contents[i][1] === 'object') {
      col.appendChild(contents[i][1]);
    }else{
      col.textContent = contents[i][1];
    }
    row.appendChild(col);
  }
  
  return row;
}

function buildRowGroup(name, value){
  let x;
  if (typeof value === 'string') {
    x = createElement('div', {className: 'alert alert-secondary alert-no-margin', style: {flexGrow: 1}}, value);
  } else {
    x = value;
  }

  let inpGrp = createElement('div', {className: 'input-group', style: {marginBottom: '8px'}},
    createElement('div', {className: 'input-group-prepend'}, 
      createElement('div', {className: 'input-group-text'}, name)
    ),
    x
  );
  return inpGrp;
}

function buildEmptyFlags(){
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

//////////////// HELPERS //////////////////
function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

function b64toBlob(b64Data) {

  var byteCharacters = atob(b64Data);
  var byteNumbers = new Array(byteCharacters.length);

  for (var offset = 0; offset < byteCharacters.length; offset++) {
    byteNumbers[offset] = byteCharacters.charCodeAt(offset);
  }
  var byteArray = new Uint8Array(byteNumbers);
  return byteArray;
}

function base64MimeType(encoded) {
  var result = null;

  if (typeof encoded !== 'string') {
    return result;
  }

  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}

function createElement(type, attributes){
  var e = document.createElement(type);
  
  var k = Object.keys(attributes);
  for(var i=0;i<k.length;i++){
    if(typeof attributes[k[i]] == 'object'){
      var k2 = Object.keys(attributes[k[i]]);
      for(var j=0;j<k2.length;j++){
        if(k[i] === 'attributes'){
          e.setAttribute(k2[j], attributes[k[i]][k2[j]]);
        }else if(k[i] === 'eventListener'){
          e.addEventListener(k2[j], attributes[k[i]][k2[j]]);
        }else{
          e[k[i]][k2[j]] = attributes[k[i]][k2[j]];
        }
      }
    }else{
      e[k[i]] = attributes[k[i]];
    }
  }
  
  if(arguments.length > 2){
    for(var i=2;i<arguments.length;i++){
      if(arguments[i] == null || arguments[i] == undefined) continue;
      if(typeof arguments[i] === 'string'){
        e.textContent = arguments[i];
      }else{
        e.appendChild(arguments[i]);
      }
    }
  }
  return e;
}