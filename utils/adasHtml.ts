/**
 * ADAS-enabled front camera HTML.
 * Runs TensorFlow.js COCO-SSD object detection in the WebView.
 * Features:
 *   - Real-time object detection (cars, trucks, people, motorcycles, bicycles)
 *   - Monocular distance estimation using known object sizes + focal length
 *   - Forward Collision Warning (FCW) with audio beep
 *   - Lane Departure Warning (LDW) using Canny edge + Hough-style line detection
 *   - Following distance display (like comma.ai)
 *   - TTC (Time To Collision) estimation
 */
export function getAdasHtml(cameraId: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  #wrap { position: relative; width: 100%; height: 100%; }
  video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  #overlay { position: absolute; inset: 0; pointer-events: none; }
  #laneCanvas { position: absolute; inset: 0; pointer-events: none; opacity: 0.7; }

  /* HUD top bar */
  #hud {
    position: absolute; top: 0; left: 0; right: 0;
    height: 36px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
    display: flex; align-items: center; padding: 0 10px; gap: 14px;
    pointer-events: none; z-index: 20;
  }
  .hudItem { display: flex; flex-direction: column; align-items: center; }
  .hudVal { color: #00e5ff; font-family: monospace; font-size: 14px; font-weight: bold; line-height: 1; }
  .hudLbl { color: #667; font-family: monospace; font-size: 7px; letter-spacing: 1px; }
  #hudDist { color: #4caf50; }
  #hudTTC { color: #ffeb3b; }

  /* FCW Warning overlay */
  #fcwWarn {
    display: none;
    position: absolute; inset: 0;
    border: 4px solid transparent;
    z-index: 30; pointer-events: none;
    animation: fcwPulse 0.4s ease-in-out infinite alternate;
  }
  #fcwWarn.critical { display: block; border-color: #ff1744; background: rgba(255,23,68,0.06); }
  #fcwWarn.warning  { display: block; border-color: #ff6d00; background: rgba(255,109,0,0.04); }
  @keyframes fcwPulse {
    from { opacity: 1; }
    to   { opacity: 0.3; }
  }
  #fcwLabel {
    position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
    font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 3px;
    display: none; pointer-events: none; z-index: 31;
  }
  #fcwLabel.critical { display: block; color: #ff1744; text-shadow: 0 0 12px #ff1744; }
  #fcwLabel.warning  { display: block; color: #ff6d00; text-shadow: 0 0 10px #ff6d00; }

  /* LDW warning */
  #ldwLeft, #ldwRight {
    display: none;
    position: absolute; top: 0; bottom: 0; width: 8px;
    pointer-events: none; z-index: 29;
    animation: ldwFlash 0.5s ease infinite alternate;
  }
  #ldwLeft  { left: 0; background: linear-gradient(to right, rgba(255,235,59,0.6), transparent); }
  #ldwRight { right: 0; background: linear-gradient(to left, rgba(255,235,59,0.6), transparent); }
  @keyframes ldwFlash { from { opacity: 1; } to { opacity: 0; } }

  /* Status */
  #status {
    position: absolute; bottom: 6px; right: 8px;
    color: #4caf50; font-family: monospace; font-size: 9px;
    pointer-events: none; z-index: 20;
  }
  #modelStatus {
    position: absolute; bottom: 6px; left: 8px;
    color: #667; font-family: monospace; font-size: 8px;
    pointer-events: none; z-index: 20;
  }

  /* Lead car distance arc */
  #distArc {
    position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
    width: 80px; text-align: center; pointer-events: none; z-index: 20;
  }
  #distValue {
    color: #4caf50; font-family: monospace; font-size: 18px; font-weight: bold;
    line-height: 1; text-shadow: 0 0 8px currentColor;
  }
  #distLabel { color: #667; font-family: monospace; font-size: 8px; letter-spacing: 2px; }

  /* Corner brackets */
  .corner {
    position: absolute; width: 16px; height: 16px;
    border-color: #00e5ff; border-style: solid; pointer-events: none; z-index: 20;
  }
  .corner.tl { top: 4px; left: 4px; border-width: 2px 0 0 2px; }
  .corner.br { bottom: 4px; right: 4px; border-width: 0 2px 2px 0; }

  /* ADAS label */
  #adasLabel {
    position: absolute; top: 6px; left: 8px;
    color: #00e5ff; font-family: monospace; font-size: 10px; font-weight: bold;
    letter-spacing: 1px; text-shadow: 0 0 6px #00e5ff;
    pointer-events: none; z-index: 20;
  }
</style>
</head>
<body>
<div id="wrap">
  <video id="video" autoplay playsinline muted></video>
  <canvas id="laneCanvas"></canvas>
  <canvas id="overlay"></canvas>

  <div id="fcwWarn"></div>
  <div id="fcwLabel">⚠ COLLISION WARNING</div>
  <div id="ldwLeft"></div>
  <div id="ldwRight"></div>

  <div id="hud">
    <div class="hudItem">
      <span class="hudVal" id="hudDist">--</span>
      <span class="hudLbl">DIST m</span>
    </div>
    <div class="hudItem">
      <span class="hudVal" id="hudTTC">--</span>
      <span class="hudLbl">TTC s</span>
    </div>
    <div class="hudItem">
      <span class="hudVal" id="hudObjs">0</span>
      <span class="hudLbl">OBJECTS</span>
    </div>
    <div class="hudItem">
      <span class="hudVal" id="hudFps">--</span>
      <span class="hudLbl">FPS</span>
    </div>
  </div>

  <div id="adasLabel">FRONT  ·  ADAS</div>

  <div id="distArc">
    <div id="distValue">--</div>
    <div id="distLabel">LEAD m</div>
  </div>

  <div id="status">INIT</div>
  <div id="modelStatus">Loading AI model…</div>

  <div class="corner tl"></div>
  <div class="corner br"></div>
</div>

<!-- TensorFlow.js + COCO-SSD -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.21.0/dist/tf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"></script>

<script>
(function() {
  'use strict';

  var CAM_INDEX = ${cameraId};

  // Known real-world object widths in metres (for distance estimation)
  var OBJECT_WIDTHS = {
    car: 1.8, truck: 2.4, bus: 2.5, motorcycle: 0.7,
    bicycle: 0.5, person: 0.5, 'traffic light': 0.3,
    dog: 0.4, cat: 0.3
  };

  // Approx focal length (calibrate for your camera; 800px typical for dashcam ~60° FOV at 1280px wide)
  var FOCAL_PX = 850;

  // FCW thresholds
  var FCW_CRITICAL_M = 5;
  var FCW_WARNING_M  = 12;
  var TTC_CRITICAL_S = 2.5;
  var TTC_WARNING_S  = 4.0;

  var video     = document.getElementById('video');
  var overlay   = document.getElementById('overlay');
  var laneCV    = document.getElementById('laneCanvas');
  var ctx       = overlay.getContext('2d');
  var laneCtx   = laneCV.getContext('2d');
  var statusEl  = document.getElementById('status');
  var modelStatusEl = document.getElementById('modelStatus');
  var fcwWarn   = document.getElementById('fcwWarn');
  var fcwLabel  = document.getElementById('fcwLabel');
  var ldwLeft   = document.getElementById('ldwLeft');
  var ldwRight  = document.getElementById('ldwRight');
  var hudDist   = document.getElementById('hudDist');
  var hudTTC    = document.getElementById('hudTTC');
  var hudObjs   = document.getElementById('hudObjs');
  var hudFps    = document.getElementById('hudFps');
  var distValue = document.getElementById('distValue');

  var model = null;
  var currentStream = null;
  var frameCount = 0;
  var lastFpsTime = Date.now();
  var prevLeadDist = null;
  var prevLeadTime = null;
  var prevLeadApproachRate = 0;   // m/s positive = approaching
  var audioCtx = null;
  var lastBeepTime = 0;

  // Audio context for beeps
  function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }

  function beep(freq, durationMs, gain) {
    if (!audioCtx) return;
    var now = Date.now();
    if (now - lastBeepTime < durationMs) return;
    lastBeepTime = now;
    try {
      var osc = audioCtx.createOscillator();
      var gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.frequency.value = freq || 880;
      gainNode.gain.value = gain || 0.3;
      osc.start();
      osc.stop(audioCtx.currentTime + (durationMs / 1000));
    } catch(e) {}
  }

  // Estimate distance in metres from bounding box width and known object width
  function estimateDistance(boxWidthPx, className) {
    var realWidth = OBJECT_WIDTHS[className];
    if (!realWidth || boxWidthPx < 5) return null;
    return (realWidth * FOCAL_PX) / boxWidthPx;
  }

  // Draw bounding box + label + distance
  function drawDetection(det, dist) {
    var x = det.bbox[0], y = det.bbox[1], w = det.bbox[2], h = det.bbox[3];
    var label = det.class;
    var score = (det.score * 100).toFixed(0);

    // Color by distance
    var color = '#4caf50';
    if (dist !== null) {
      if (dist < FCW_CRITICAL_M)     color = '#ff1744';
      else if (dist < FCW_WARNING_M) color = '#ff6d00';
      else if (dist < 25)            color = '#ffeb3b';
    }

    // Box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Corner accents
    var cs = 8;
    ctx.lineWidth = 3;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(function(c) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + c[2]*cs, c[1]);
      ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3]*cs);
      ctx.stroke();
    });

    // Label background
    var distStr = dist !== null ? ' ' + dist.toFixed(1) + 'm' : '';
    var txt = label.toUpperCase() + distStr + ' ' + score + '%';
    ctx.font = 'bold 10px monospace';
    var tw = ctx.measureText(txt).width + 6;
    ctx.fillStyle = color + 'cc';
    ctx.fillRect(x, y - 16, tw, 14);
    ctx.fillStyle = '#000';
    ctx.fillText(txt, x + 3, y - 5);

    // TTC bar if approaching
    if (dist !== null && dist < 30 && prevLeadApproachRate > 0.5) {
      var ttc = dist / prevLeadApproachRate;
      var barW = Math.min(w, 80);
      var barPct = Math.max(0, Math.min(1, ttc / TTC_WARNING_S));
      ctx.fillStyle = '#111';
      ctx.fillRect(x, y + h + 2, barW, 4);
      ctx.fillStyle = barPct > 0.5 ? '#4caf50' : barPct > 0.25 ? '#ffeb3b' : '#ff1744';
      ctx.fillRect(x, y + h + 2, barW * (1 - barPct), 4);
    }
  }

  // Lane detection using simple edge detection on the lower half of the frame
  var laneOffscreenCV = document.createElement('canvas');
  var laneOCtx = laneOffscreenCV.getContext('2d');
  var laneLastRun = 0;
  var ldwState = 0; // 0=ok, -1=left, 1=right

  function runLaneDetection() {
    var W = laneCV.width, H = laneCV.height;
    // Only process bottom 45% of frame (road area)
    var roiY = Math.floor(H * 0.55), roiH = Math.floor(H * 0.45);
    laneOffscreenCV.width = W;
    laneOffscreenCV.height = roiH;

    // Draw the video ROI
    try {
      laneOCtx.drawImage(video, 0, roiY, W, roiH, 0, 0, W, roiH);
    } catch(e) { return; }

    var imgData = laneOCtx.getImageData(0, 0, W, roiH);
    var data = imgData.data;

    // Convert to greyscale + simple edge detection (Sobel-lite)
    var grey = new Uint8Array(W * roiH);
    for (var i = 0; i < W * roiH; i++) {
      grey[i] = (data[i*4]*0.299 + data[i*4+1]*0.587 + data[i*4+2]*0.114);
    }

    // Threshold for lane markings (white/yellow lines are bright)
    var edgePts = [];
    var centerX = W / 2;
    for (var y = 0; y < roiH; y++) {
      for (var x = 1; x < W - 1; x++) {
        var idx = y * W + x;
        var gx = grey[idx+1] - grey[idx-1];
        var gy = (y > 0 ? grey[idx-W] : grey[idx]) - (y < roiH-1 ? grey[idx+W] : grey[idx]);
        var mag = Math.sqrt(gx*gx + gy*gy);
        // Also check brightness (lane markings are bright)
        if (mag > 50 && grey[idx] > 130) {
          edgePts.push({ x: x, y: y + roiY });
        }
      }
    }

    // Find left and right lane lines (below centre, left of centre / right of centre)
    var leftPts = edgePts.filter(function(p){ return p.x < centerX - 40; });
    var rightPts = edgePts.filter(function(p){ return p.x > centerX + 40; });

    laneCtx.clearRect(0, 0, W, H);

    function fitLine(pts, color) {
      if (pts.length < 10) return null;
      // Simple least-squares line fit
      var n = pts.length, sx=0, sy=0, sxy=0, sxx=0;
      pts.forEach(function(p){ sx+=p.x; sy+=p.y; sxy+=p.x*p.y; sxx+=p.x*p.x; });
      var denom = n*sxx - sx*sx;
      if (Math.abs(denom) < 1) return null;
      var m = (n*sxy - sx*sy) / denom;
      var b = (sy - m*sx) / n;
      // Draw line
      var y1 = roiY, y2 = H - 10;
      var x1 = (y1 - b) / m, x2 = (y2 - b) / m;
      laneCtx.beginPath();
      laneCtx.strokeStyle = color;
      laneCtx.lineWidth = 2;
      laneCtx.setLineDash([12, 6]);
      laneCtx.moveTo(x1, y1);
      laneCtx.lineTo(x2, y2);
      laneCtx.stroke();
      laneCtx.setLineDash([]);
      return { m: m, b: b };
    }

    var leftLine  = fitLine(leftPts,  '#ffeb3b');
    var rightLine = fitLine(rightPts, '#ffeb3b');

    // LDW: check if car is drifting (lane centre deviates from image centre)
    if (leftLine && rightLine) {
      var midY = H * 0.8;
      var lX = (midY - leftLine.b) / leftLine.m;
      var rX = (midY - rightLine.b) / rightLine.m;
      var laneCentre = (lX + rX) / 2;
      var deviation = laneCentre - centerX;
      var laneWidth = rX - lX;

      // Fill lane corridor
      laneCtx.beginPath();
      laneCtx.fillStyle = 'rgba(0,229,255,0.05)';
      var topY = roiY;
      laneCtx.moveTo((topY - leftLine.b)  / leftLine.m,  topY);
      laneCtx.lineTo((topY - rightLine.b) / rightLine.m, topY);
      laneCtx.lineTo((H - rightLine.b)    / rightLine.m, H);
      laneCtx.lineTo((H - leftLine.b)     / leftLine.m,  H);
      laneCtx.closePath();
      laneCtx.fill();

      // Departure threshold: 15% of lane width
      var threshold = laneWidth * 0.15;
      if (deviation < -threshold) { ldwState = -1; }
      else if (deviation > threshold) { ldwState = 1; }
      else { ldwState = 0; }
    } else {
      ldwState = 0;
    }

    ldwLeft.style.display  = (ldwState === -1) ? 'block' : 'none';
    ldwRight.style.display = (ldwState === 1)  ? 'block' : 'none';

    if (ldwState !== 0) {
      beep(440, 300, 0.15);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ldw', direction: ldwState === -1 ? 'left' : 'right'
      }));
    }
  }

  // Main detection loop
  async function detect() {
    if (!model || video.readyState < 2) {
      requestAnimationFrame(detect);
      return;
    }

    var W = video.videoWidth, H = video.videoHeight;
    if (W === 0 || H === 0) { requestAnimationFrame(detect); return; }

    overlay.width  = W; overlay.height  = H;
    laneCV.width   = W; laneCV.height   = H;

    ctx.clearRect(0, 0, W, H);

    var predictions;
    try {
      predictions = await model.detect(video);
    } catch(e) {
      requestAnimationFrame(detect);
      return;
    }

    // Filter to road-relevant classes
    var ROAD_CLASSES = ['car','truck','bus','motorcycle','bicycle','person','traffic light','stop sign'];
    var relevant = predictions.filter(function(p){ return ROAD_CLASSES.indexOf(p.class) >= 0 && p.score > 0.45; });

    var leadDist = null;
    var leadClass = null;

    relevant.forEach(function(det) {
      var dist = estimateDistance(det.bbox[2], det.class);
      if (dist !== null && dist < 60) {
        if (leadDist === null || dist < leadDist) {
          leadDist = dist;
          leadClass = det.class;
        }
      }
      drawDetection(det, dist);
    });

    hudObjs.textContent = relevant.length;

    // Lead vehicle tracking
    var now = Date.now();
    if (leadDist !== null) {
      if (prevLeadDist !== null && prevLeadTime !== null) {
        var dt = (now - prevLeadTime) / 1000;
        if (dt > 0.05) {
          prevLeadApproachRate = (prevLeadDist - leadDist) / dt;
        }
      }
      prevLeadDist = leadDist;
      prevLeadTime = now;

      // Display
      var distStr = leadDist.toFixed(1);
      hudDist.textContent = distStr;
      distValue.textContent = distStr;

      var distEl = document.getElementById('distValue');
      if (leadDist < FCW_CRITICAL_M)     { distEl.style.color = '#ff1744'; }
      else if (leadDist < FCW_WARNING_M) { distEl.style.color = '#ff6d00'; }
      else if (leadDist < 25)            { distEl.style.color = '#ffeb3b'; }
      else                               { distEl.style.color = '#4caf50'; }

      // TTC
      if (prevLeadApproachRate > 0.2) {
        var ttc = leadDist / prevLeadApproachRate;
        hudTTC.textContent = ttc.toFixed(1);
        hudTTC.style.color = ttc < TTC_CRITICAL_S ? '#ff1744' : ttc < TTC_WARNING_S ? '#ff6d00' : '#ffeb3b';
      } else {
        hudTTC.textContent = '∞';
        hudTTC.style.color = '#4caf50';
      }

      // FCW
      var fcwLevel = '';
      if (leadDist < FCW_CRITICAL_M || (prevLeadApproachRate > 0.5 && leadDist / prevLeadApproachRate < TTC_CRITICAL_S)) {
        fcwLevel = 'critical';
        beep(1200, 200, 0.5);
      } else if (leadDist < FCW_WARNING_M || (prevLeadApproachRate > 0.5 && leadDist / prevLeadApproachRate < TTC_WARNING_S)) {
        fcwLevel = 'warning';
        beep(800, 400, 0.3);
      }

      fcwWarn.className  = fcwLevel;
      fcwLabel.className = fcwLevel;

      if (fcwLevel) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'fcw', level: fcwLevel, distance: leadDist,
          ttc: prevLeadApproachRate > 0 ? leadDist / prevLeadApproachRate : 99
        }));
      }
    } else {
      hudDist.textContent = '--';
      hudTTC.textContent  = '--';
      distValue.textContent = '--';
      fcwWarn.className   = '';
      fcwLabel.className  = '';
      prevLeadApproachRate = 0;
    }

    // Lane detection every 6 frames (cheaper)
    frameCount++;
    if (frameCount % 6 === 0) {
      try { runLaneDetection(); } catch(e) {}
    }

    // FPS counter
    if (frameCount % 10 === 0) {
      var elapsed = (now - lastFpsTime) / 1000;
      hudFps.textContent = (10 / elapsed).toFixed(0);
      lastFpsTime = now;
    }

    requestAnimationFrame(detect);
  }

  // Start camera
  function startCamera() {
    statusEl.textContent = 'SCAN...';
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
      var cams = devices.filter(function(d){ return d.kind === 'videoinput'; });
      var target = cams[CAM_INDEX] || cams[0];
      if (!target) throw new Error('No camera');
      return navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: target.deviceId },
          width: { ideal: 1280 }, height: { ideal: 720 }
        }, audio: false
      });
    }).then(function(stream) {
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = function() {
        video.play();
        statusEl.textContent = 'LIVE';
        initAudio();
      };
    }).catch(function(err) {
      statusEl.textContent = 'CAM ERR';
      statusEl.style.color = '#ff5252';
    });
  }

  // Load model then start
  modelStatusEl.textContent = 'Loading COCO-SSD…';
  cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(function(m) {
    model = m;
    modelStatusEl.textContent = 'AI READY';
    setTimeout(function(){ modelStatusEl.style.opacity = '0.3'; }, 3000);
    detect();
  }).catch(function(err) {
    modelStatusEl.textContent = 'AI OFFLINE (no net)';
    // Still run camera without detection
    detect();
  });

  startCamera();

})();
</script>
</body>
</html>`;
}
