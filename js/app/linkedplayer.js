define(['jquery', './gbc-link', './joypad', './roms', 'base64-arraybuffer', 'jquery-cookie'],
    function($, gbcLink, joypad, roms, b64ab) {
  "use strict"

  var apiVersion = 1;
  var ws = null;

  var gblink = null;
  var canvas = null;

  var id = null;
  var player = null;

  var romPath = null;
  var romImage = null;

  var pressed = {};
  var delay = null;

  var syncTick = 0;
  var updateTick = 0;
  var tickLoopRunning = false;

  var frameRate = 59.7275;
  var lastFrameTime = 0;

  // XXX: these callbacks are by type, which is adequate for now.
  // We should probably use the token instead, but then GC is tricky.
  var msgCallbacks = {};

  var debugMessages = false;

  function main() {
    ws = new WebSocket("ws://" + window.location.host + "/ws");
    msgCallbacks['server_info'] = onConnect;
    ws.onmessage = function(ev) {
      recvMsg(JSON.parse(ev.data));
    };
    if (!window.location.hash) {
      createGame();
    } else {
      id = Number(window.location.hash.slice(1));
      joinGame();
    }
    // TODO: are you sure you want to exit?
  }

  function recvMsg(msg) {
    if (debugMessages)
      console.log('recv', msg.type, msg.data, msg.token);
    msgCallbacks[msg.type](msg);
  }

  function sendMsg(type, data, callback) {
    if (debugMessages)
      console.log('send', type, data);
    if (callback != null) {
      msgCallbacks[type] = callback;
    }
    ws.send(JSON.stringify({
      'type': type,
      'data': data,
      'token': 0
    }));
  }

  function onConnect(serverInfo) {
    if (serverInfo.data.api_version != apiVersion) {
      console.log("invalid API version", serverInfo.data.api_version);
      return;
    }
  }


  function createGame() {
    var go = function() {
      $('#create-panel').show();

      // initialize ROM picker
      romPath = $.cookie("rom-path");
      if(romPath == null || roms.indexOf(romPath) < 0) {
        romPath = roms[0];
      }
      var picker = $('#rom-picker');
      $.each(roms, function(k, v) {
        picker.append($("<option></option>").attr("value", v).text(v));
      });
      picker.val(romPath);
      $('#create-submit').click(createSubmitted);
    };

    var createSubmitted = function() {
      $('#create-panel').hide();

      // get ROM path from picker
      romPath = $('#rom-picker').val();
      $.cookie("rom-path", romPath, {expires: 1000});

      // get ROM image from server
      var req = new XMLHttpRequest();
      req.open('get', 'roms/' + romPath, true);
      req.responseType = 'arraybuffer';
      req.onload = function(ev) {
        romImage = req.response;
        romLoaded();
      };
      req.send(null);
    };

    var romLoaded = function() {
      msgCallbacks['ack_create'] = gameCreated;
      msgCallbacks['start'] = gameStarted;
      sendMsg('create', {
        'name': romPath,
        'rom_image': b64ab.encode(romImage)
      });
    };

    var gameCreated = function(ackCreate) {
      id = ackCreate.data.id;
      $('#status-banner').text('Game #' + id);
      $('#status').text('Waiting for another player...');
      var link = document.location.href + '#' + id;
      $('#game-link').attr('href', link).text(link);
      $('#status-panel').show();
      player = ackCreate.data.player;
    }

    go();
  }

  function joinGame() {
    var go = function() {
      $('#join-panel').show();
      $('#join-msg').text('Joining game #' + id + '...');
      $('#join-submit').click(joinSubmitted);
    };

    var joinSubmitted = function() {
      $('#join-panel').hide();
      msgCallbacks['ack_join'] = gameJoined;
      msgCallbacks['start'] = gameStarted;
      sendMsg('join', {
        'id': id,
      });
    };

    var gameJoined = function(ackJoin) {
      if (ackJoin.data.error != null) {
        $('#status-banner').text('Game #' + id);
        $('#status').text('Error: ' + ackJoin.data.error);
      } else {
        $('#status-banner').text('Game #' + id);
        $('#status').text('Waiting for game to start...');
        player = ackJoin.data.player;
        romImage = b64ab.decode(ackJoin.data.rom_image);
      }
      var link = document.location.href;
      $('#game-link').attr('href', link).text(link);
      $('#status-panel').show();
    };

    go();
  }

  function gameStarted(start) {
    $('#status').text('');
    $('#play-panel').show();

    $('body').keydown(keyDown);
    $('body').keyup(keyUp);

    // clear canvas
    canvas = $("#lcd")[0];
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    var image = new Uint8Array(romImage);
    if (player === 0) {
      gblink = gbcLink.create(image, localFrameCallback, remoteFrameCallback, true, true);
    } else if (player === 1) {
      gblink = gbcLink.create(image, remoteFrameCallback, localFrameCallback, true, true);
    }
    gblink.boot();

    msgCallbacks['sync'] = synchronize;
    msgCallbacks['finish'] = finish;

    // run the first ticks
    delay = start.data.delay;

    while (updateTick < syncTick + delay) {
      gblink.advance();
    }
  }

  var last = 0;

  function synchronize(sync) {
    // check and update tick
    if (syncTick != sync.data.tick) {
      console.log("mismatched tick, got", sync.data.tick, "expected", syncTick);
    }
    syncTick++;

    // update key presses
    var buttons = Object.keys(joypad.buttons);
    var pressed1 = JSON.parse(sync.data.keys_down[0]);
    for (var i = 0; i < buttons.length; i++) {
      if (pressed1[i]) {
        gblink.gbc1.joypad.press(i);
      } else {
        gblink.gbc1.joypad.unpress(i);
      }
    }
    var pressed2 = JSON.parse(sync.data.keys_down[1]);
    for (var i = 0; i < buttons.length; i++) {
      if (pressed2[i]) {
        gblink.gbc2.joypad.press(i);
      } else {
        gblink.gbc2.joypad.unpress(i);
      }
    }

    runTicks();
  }

  // Runs ticks until the window is full (ie. updateTick == syncTick + delay)
  // at frameRate. Can be called concurrently.
  function runTicks() {
    if (tickLoopRunning)
      return;
    tickLoopRunning = true;

    var diff = function() {
      return lastFrameTime - (new Date()).getTime() + 1000.0 / frameRate;
    }

    var advanceOne = function () {
      if (updateTick < syncTick + delay) {
        lastFrameTime = (new Date()).getTime();
        gblink.advance();
        setTimeout(advanceOne, diff());
      } else {
        tickLoopRunning = false;
      }
    }

    setTimeout(advanceOne.bind(this, updateTick), diff());
  }

  function finish() {
  }

  function sendUpdate() {
    sendMsg('update', {
      'keys_down': JSON.stringify(pressed), // XXX: double JSON wrapping for now...
      'tick': updateTick
    });
    updateTick++;
  }

  function localFrameCallback(link, gb, fb) {
    // draw to the canvas
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    var imageData = ctx.createImageData(canvas.width / 8, canvas.height / 8);
    var data = imageData.data;
    for(var i = 0; i < fb.length; i++) {
      data[4*i + 0] = fb[i];
      data[4*i + 1] = fb[i];
      data[4*i + 2] = fb[i];
      data[4*i + 3] = 0xff;
    }
    var newCanvas = $("<canvas>").attr("width", imageData.width).attr("height", imageData.height)[0];
    newCanvas.getContext("2d").putImageData(imageData, 0, 0);
    ctx.drawImage(newCanvas, 0, 0, canvas.width, canvas.height);

    if (gb == link.gbc2) {
      sendUpdate();
      link.pause();
    }
  }

  function remoteFrameCallback(link, gb, fb) {
    if (gb == link.gbc2) {
      sendUpdate();
      link.pause();
    }
  }

  function getButton(keycode) {
    var b = joypad.buttons;
    switch(keycode) {
    case 90:
      return b.A;
    case 88:
      return b.B;
    case 13:
      return b.START;
    case 220:
      return b.SELECT;
    case 37:
      return b.LEFT;
    case 38:
      return b.UP;
    case 39:
      return b.RIGHT;
    case 40:
      return b.DOWN;
    default:
      return null;
    }
  };

  function keyDown(ev) {
    var button = getButton(ev.keyCode);
    if(button == null)
      return;
    pressed[button] = true;
  }

  function keyUp(ev) {
    var button = getButton(ev.keyCode);
    if(button == null)
      return;
    pressed[button] = false;
  }

  return main;
});
