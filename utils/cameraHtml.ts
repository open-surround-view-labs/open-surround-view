/**
 * Generates HTML that uses getUserMedia to display a camera feed.
 * The cameraIndex selects which video device (0=first, 1=second, etc.)
 * Used inside a WebView for each camera panel.
 */
export function getCameraHtml(cameraIndex: number, label: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  #container { position: relative; width: 100%; height: 100%; }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transform: scaleX(-1);
  }
  #label {
    position: absolute;
    top: 6px;
    left: 8px;
    color: #00e5ff;
    font-family: monospace;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
    text-shadow: 0 0 6px #00e5ff;
    pointer-events: none;
    z-index: 10;
  }
  #status {
    position: absolute;
    bottom: 6px;
    right: 8px;
    color: #4caf50;
    font-family: monospace;
    font-size: 9px;
    pointer-events: none;
    z-index: 10;
  }
  #overlay {
    position: absolute;
    inset: 0;
    border: 1px solid rgba(0,229,255,0.2);
    pointer-events: none;
    z-index: 5;
  }
  /* Corner brackets */
  #overlay::before, #overlay::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: #00e5ff;
    border-style: solid;
  }
  #overlay::before {
    top: 4px; left: 4px;
    border-width: 2px 0 0 2px;
  }
  #overlay::after {
    bottom: 4px; right: 4px;
    border-width: 0 2px 2px 0;
  }
  #error {
    display: none;
    position: absolute;
    inset: 0;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #ff5252;
    font-family: monospace;
    font-size: 11px;
    text-align: center;
    padding: 10px;
    gap: 6px;
  }
  #error.visible { display: flex; }
  #errIcon { font-size: 24px; }
  #retryBtn {
    margin-top: 8px;
    padding: 4px 10px;
    background: #1a1a2a;
    color: #00e5ff;
    border: 1px solid #00e5ff;
    border-radius: 3px;
    font-family: monospace;
    font-size: 10px;
    cursor: pointer;
  }
</style>
</head>
<body>
<div id="container">
  <video id="video" autoplay playsinline muted></video>
  <div id="label">${label}</div>
  <div id="status" id="status">INIT</div>
  <div id="overlay"></div>
  <div id="error">
    <span id="errIcon">⚠</span>
    <span id="errMsg">Camera not available</span>
    <button id="retryBtn" onclick="startCamera()">RETRY</button>
  </div>
</div>
<script>
  var cameraIndex = ${cameraIndex};
  var video = document.getElementById('video');
  var status = document.getElementById('status');
  var errorDiv = document.getElementById('error');
  var errMsg = document.getElementById('errMsg');
  var currentStream = null;

  function setStatus(txt, color) {
    status.textContent = txt;
    status.style.color = color || '#4caf50';
  }

  function showError(msg) {
    if (currentStream) {
      currentStream.getTracks().forEach(function(t){ t.stop(); });
    }
    video.style.display = 'none';
    errorDiv.className = 'visible';
    errMsg.textContent = msg || 'Camera error';
    setStatus('ERR', '#ff5252');
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'cameraError', index: cameraIndex, message: msg
    }));
  }

  function startCamera() {
    errorDiv.className = '';
    video.style.display = 'block';
    setStatus('SCAN...', '#ffeb3b');

    navigator.mediaDevices.enumerateDevices().then(function(devices) {
      var videoDevices = devices.filter(function(d){ return d.kind === 'videoinput'; });
      setStatus('FOUND ' + videoDevices.length, '#ffeb3b');

      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'devicesFound', index: cameraIndex, count: videoDevices.length,
        devices: videoDevices.map(function(d){ return { id: d.deviceId, label: d.label }; })
      }));

      if (videoDevices.length === 0) {
        showError('No cameras found');
        return;
      }

      var targetDevice = videoDevices[cameraIndex] || videoDevices[0];
      var constraints = {
        video: {
          deviceId: { exact: targetDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      return navigator.mediaDevices.getUserMedia(constraints);
    }).then(function(stream) {
      if (!stream) return;
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = function() {
        video.play();
        setStatus('LIVE', '#4caf50');
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'cameraReady', index: cameraIndex
        }));
      };
    }).catch(function(err) {
      showError(err.name + ': ' + err.message);
    });
  }

  // Start immediately
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startCamera();
  } else {
    showError('MediaDevices API not available');
  }
</script>
</body>
</html>`;
}

/**
 * Generates HTML for displaying an MJPEG stream URL.
 * Used as fallback when camera2/getUserMedia doesn't work.
 */
export function getMjpegHtml(url: string, label: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  #container { position: relative; width: 100%; height: 100%; }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  #label {
    position: absolute;
    top: 6px; left: 8px;
    color: #00e5ff;
    font-family: monospace;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
    text-shadow: 0 0 6px #00e5ff;
    z-index: 10;
  }
  #status {
    position: absolute;
    bottom: 6px; right: 8px;
    font-family: monospace;
    font-size: 9px;
    color: #4caf50;
    z-index: 10;
  }
  #overlay {
    position: absolute;
    inset: 0;
    border: 1px solid rgba(0,229,255,0.2);
    pointer-events: none;
  }
</style>
</head>
<body>
<div id="container">
  <img id="stream" src="${url}"
    onload="document.getElementById('status').textContent='LIVE';document.getElementById('status').style.color='#4caf50';"
    onerror="document.getElementById('status').textContent='ERR';document.getElementById('status').style.color='#ff5252';" />
  <div id="label">${label}</div>
  <div id="status">CONN...</div>
  <div id="overlay"></div>
</div>
</body>
</html>`;
}

/**
 * Generates HTML for a bird's-eye composite view.
 * Draws 4 camera feeds in a top-down car layout using canvas.
 */
export function getBirdsEyeHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #0a0a14; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  canvas { display: block; }
  #label {
    position: absolute;
    top: 8px; left: 50%; transform: translateX(-50%);
    color: #00e5ff;
    font-family: monospace;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 2px;
    text-shadow: 0 0 8px #00e5ff;
  }
</style>
</head>
<body>
<div id="label">BIRD'S EYE VIEW</div>
<canvas id="c"></canvas>
<script>
  var c = document.getElementById('c');
  var ctx = c.getContext('2d');
  var W = window.innerWidth, H = window.innerHeight;
  c.width = W; c.height = H;

  function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    var cx = W/2, cy = H/2;
    var cw = W * 0.3, ch = H * 0.5;

    // Car body
    ctx.fillStyle = '#1a1a2a';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - cw/2, cy - ch/2, cw, ch, 12);
    ctx.fill();
    ctx.stroke();

    // Windows
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(cx - cw/2 + 10, cy - ch/4, cw - 20, ch/2);

    // Front label
    var zoneColor = 'rgba(0,229,255,0.08)';
    var borderColor = 'rgba(0,229,255,0.4)';

    function drawZone(x, y, w, h, txt) {
      ctx.fillStyle = zoneColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, x + w/2, y + h/2);
    }

    var pad = 8;
    var zoneW = (W - cw - 80) / 2 - pad;
    var zoneH = 50;

    // FRONT
    drawZone(cx - cw/4, cy - ch/2 - zoneH - pad, cw/2, zoneH, 'FRONT');
    // REAR
    drawZone(cx - cw/4, cy + ch/2 + pad, cw/2, zoneH, 'REAR');
    // LEFT
    drawZone(cx - cw/2 - zoneW - pad, cy - zoneH/2, zoneW, zoneH, 'LEFT');
    // RIGHT
    drawZone(cx + cw/2 + pad, cy - zoneH/2, zoneW, zoneH, 'RIGHT');

    // Grid lines
    ctx.strokeStyle = 'rgba(0,229,255,0.1)';
    ctx.lineWidth = 0.5;
    for (var i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * W/6, 0);
      ctx.lineTo(i * W/6, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * H/6);
      ctx.lineTo(W, i * H/6);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W-2, H-2);
  }

  draw();
  window.addEventListener('resize', function() {
    W = window.innerWidth; H = window.innerHeight;
    c.width = W; c.height = H;
    draw();
  });
</script>
</body>
</html>`;
}
