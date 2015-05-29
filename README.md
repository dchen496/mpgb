MPGB: Multiplayer Javascript Game Boy Emulator
==============================================

MPGB is a multiplayer Javascript Game Boy emulator. It currently supports
emulating the original Nintendo Game Boy, both in single player and a two
player linked configurations in the same browser window. The eventual goal is
to support linked configurations over WebSockets. It is interpretive and
designed to run in a modern HTML5 web browser.

Current status
--------------
- CPU: Fully functional. Passes all of Blargg's Game Boy instruction, 
  instruction timing and interrupt tests.
- Video: Fully functional.
- Joypad: Fully functional.
- Timer: Fully functional.
- Serial port: Fully functional.
- Cartridge: Memory bank controllers MBC0, MBC1 and MBC3 are implemented and
  tested. MBC5 is implemented but untested. MBC2 and MBC4 are unimplemented.
  Saving and RTC functionality are unimplemented.
- Sound: Not implemented.

Current issues
--------------
- ROM list is hardcoded, in js/apps/roms.js.
- Saving is not supported in any form.
- WebSockets support is missing.

Usage
-----
Put ROMs into a folder called "roms" in the root directory. Open player.html
for the single player emulator, or multiplayer.html for the two player
emulator. Controls are: Z: A, X: B, enter: start, backslash: select, and arrow
keys for the D-pad. Hold down shift to control the second player for the two
player emulator.

Tested browsers
---------------
- Chrome 43
- Firefox 38

Acknowledgements
----------------
- Pan/ATX, nocash: [Game Boy specification document](http://bgb.bircd.org/pandocs.htm)
- Blargg: [Game Boy test roms](http://gbdev.gg8.se/files/roms/blargg-gb-tests/)
- Cristian Dinu: [Z80 opcode decoding information](http://www.z80.info/decoding.htm)
