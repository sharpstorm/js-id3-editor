// As defined in ID3 V2.4 specifications

const id3Frames = {
  "AENC": "Audio Encryption",
  "APIC": "Attached Picture",
  
  "COMM": "Comments",
  "COMR": "Commercial Frame", //not implemented (4.24)
  
  "ENCR": "Encryption Method Registration", //not implemented (4.25)
  "ETCO": "Event Timing Codes", //not implemented (4.5)
  
  "GEOB": "General encapsulated object",
  "GRID": "Group identification registration", //not implemented (4.26)
  
  "LINK": "Linked Information", //not implemented (4.20)
  
  "MCDI": "Music CD identifier", //not implemented (4.4)
  "MLLT": "MPEG location lookup table", //not implemented(4.6)
  
  "OWNE": "Ownership frame",
  
  "PRIV": "Private frame", //not implemented (4.27)
  "PCNT": "Play counter",
  "POPM": "Popularimeter",
  "POSS": "Position synchronisation frame", //not implemented (4.21)
  
  "RBUF": "Recommended buffer size", //not implemented (4.18)
  "RVRB": "Reverb", //not implemented (4.13)
  
  "SYLT": "Synchronised lyric/text", //not implemented (4.9)
  "SYTC": "Synchronised tempo codes", //not implemented (4.7)
  
  "TALB": "Album/Movie/Show title",
  "TBPM": "BPM (beats per minute)",
  "TCOM": "Composer",
  "TCON": "Content type",
  "TCOP": "Copyright message",
  "TDLY": "Playlist delay",
  "TENC": "Encoded by",
  "TEXT": "Lyricist/Text writer",
  "TFLT": "File type",
  "TIT1": "Content group description",
  "TIT2": "Title/songname/content description",
  "TIT3": "Subtitle/Description refinement",
  "TKEY": "Initial key",
  "TLAN": "Language(s)",
  "TLEN": "Length",
  "TMED": "Media type",
  "TOAL": "Original album/movie/show title",
  "TOFN": "Original filename",
  "TOLY": "Original lyricist(s)/text writer(s)",
  "TOPE": "Original artist(s)/performer(s)",
  "TOWN": "File owner/licensee",
  "TPE1": "Lead performer(s)/Soloist(s)",
  "TPE2": "Band/orchestra/accompaniment",
  "TPE3": "Conductor/performer refinement",
  "TPE4": "Interpreted, remixed, or otherwise modified by",
  "TPOS": "Part of a set",
  "TPUB": "Publisher",
  "TRCK": "Track number/Position in set",
  "TRSN": "Internet radio station name",
  "TRSO": "Internet radio station owner",
  "TSRC": "ISRC (international standard recording code)",
  "TSSE": "Software/Hardware and settings used for encoding",
  "TXXX": "User defined text information frame",
  "UFID": "Unique file identifier",
  "USER": "Terms of use",
  "USLT": "Unsynchronised lyric/text transcription",

  "WCOM": "Commercial information",
  "WCOP": "Copyright/Legal information",
  "WOAF": "Official audio file webpage",
  "WOAR": "Official artist/performer webpage",
  "WOAS": "Official audio source webpage",
  "WORS": "Official Internet radio station homepage",
  "WPAY": "Payment",
  "WPUB": "Publishers official webpage",
  "WXXX": "User defined URL link frame"
};

//Declares new tags in v2.4
const newTags = {
  "ASPI": "Audio Seek Point Index", //not implemented (4.30)
  
  "EQU2": "Equalisation (2)", //not implemented (4.12)
  
  "RVA2": "Relative volume adjustment (2)", //not implemented (4.11)
  
  "SEEK": "Seek frame", //not implemented (4.29)
  "SIGN": "Signature frame", //not implemented (4.28)
  
  "TDEN": "Encoding time",
  "TDOR": "Original release time",
  "TDRC": "Recording time",
  "TDRL": "Release time",
  "TDTG": "Tagging time",
  "TIPL": "Involved people list",
  "TMCL": "Musician credits list",
  "TMOO": "Mood",
  "TPRO": "Produced notice",
  "TSOA": "Album sort order",
  "TSOP": "Performer sort order",
  "TSOT": "Title sort order",
  "TSST": "Set subtitle"
}

//Declares old tags in v2.3
const legacyTag = {
  "TYER": "Year",
  "EQUA": "Equalisation",
  "IPLS": "Involved people list",
  "TDAT": "Date",
  "TIME": "Time",
  "TORY": "Original release year",
  "TRDA": "Recording Dates",
  "TSIZ": "Size"
}

const encodings = ["ISO-8859-1", "UCS-2", "UTF-16", "UTF-8"];
const encodingWidths = [1, 2, 2, 1];
/*
  00 - ISO-8859-1. Terminated with 0x00
  01 - UCS-2 (UTF-16 encoded Unicode with BOM). Terminated with $00 00
  02 - UTF-16BE (Unicode without BOM), in ID3v2.4. Terminated with $00 00
  03 - UTF-8 encoded Unicode, in ID3v2.4. Terminated with $00
*/

const pictureTypes = [
  "Other",
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. label side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype"
]