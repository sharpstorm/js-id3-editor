Javascript-based ID3 Tag editor
=================

This application was written as a testbed for processing binary files in Javascript.
\ ゜o゜)ノ

-------------------

Only a subset of the full ID3 V2.3 and V2.4 standards are implemented in this library,
which should cover all the commonly used ID3 frames including text frames, link frames and
picture frame. 

Unhandled frames are displayed in binary and editting is not allowed. They will be
copied over to the exported file.

The implementation follows the tag specification found below
* [ID3 V2.3](https://id3.org/id3v2.3.0)
* [ID3 V2.4 Structure](https://id3.org/id3v2.4.0-structure)
* [ID3 V2.4 Frames](https://id3.org/id3v2.4.0-frames)

# Excluded Frames
* COMR
* ENCR
* ETCO
* GRID
* LINK
* MCDI
* MLLT
* PRIV
* POSS
* RBUF
* RVRB
* SYLT
* SYTC
* ASPI
* EQU2
* RVA2
* SEEK
* SIGN