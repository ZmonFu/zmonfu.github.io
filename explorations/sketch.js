let capture;
let captureEvent;

let baseImg1, baseImg2;
let imageQ, imageW, imageE, imageR, imageT;

// Explain + Hand overlays
let explainImg;
let handImg;
let showHandOverlay = false;

let naviImg;
let hideBase = false; // wenn true: base_1 + base_2 aus

let overlayN;
let overlayH;


// einmalig “gegen-gespiegelte” Varianten (damit sie nach mirrorCanvas normal aussehen)
let imageQf, imageWf, imageEf, imageRf, imageTf;

let displayScale = 1;
let dispW, dispH, offsetX, offsetY;

let paletteHex = ["#FBF5F3", "#5f4bb6", "#E980FC", "#C5FF32", "#0a140aff"];
let palette = [];
let asciiColors = [];

let currentMode = "Q";

// --- CONFIG ---
const INTERNAL_MASK_WIDTH = 640;

// Rastergrößen
let maskPixelSize = 6;  // NUR Maske (Noise-Rects)
let asciiPixelSize = 6; // NUR ASCII (Zeichen-Raster)

// ASCII supersampling
let asciiRenderScale = 2;

let lastHandsSeenMs = 0;
const EXPLAIN_DELAY_MS = 2000;
const EXPLAIN_FADE_MS  = 350;

// Noise
let scaleN = 0.02;

// Masken-Größe
let maxDist = 250;
let maskScale = 0.6;

let densityNear = 0.8;
let densityFar = 0.1;

// S Pixelate
let pixelateBlockSize = 10;

let overlays = {}; // mode -> p5.Image

// ASCII charsets
let asciiCharDe =
  " $@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`'. ";
let asciiCharJa =
  "黒目井田ー夕力ヵロヨヲワヘモメホハナテヌユコツソシイレノ?=+*⁺;:‐､ﾟ｡･　";
let asciiCharGeo = "█▓▒░▉▊▋▌▍▎▏◼◾◾◽▫□▪◻◯○◇◌∙· ";
let asciiCharEmoji = "❤";
let asciiCharB = ".:-=+*#%@";

let missingMessage = "";
const tipIndices = [4, 8, 12, 16, 20];

// ------------------------------------------------------------
// PERFORMANCE: Reuse-Buffers
// ------------------------------------------------------------
let gTargetW = 0, gTargetH = 0;

let contentG = null;       // tw x th
let finalG = null;         // tw x th
let maskG = null;          // tw x th (nearest)
let containG = null;       // tw x th (contain)

let maskInternalG = null;  // INTERNAL_MASK_WIDTH x internalH

let camFrameImg = null;    // p5.Image tw x th
let smallImg = null;       // p5.Image pixelW x pixelH (reused)

let asciiBuffer = null;    // supersampled
let asciiOutG = null;      // tw x th

let asciiSampleCache = {
  cols: 0, rows: 0, sw: 0, sh: 0,
  sx: null, sy: null,
};

function ensureTargetBuffers(targetW, targetH) {
  const tw = max(1, floor(targetW));
  const th = max(1, floor(targetH));

  if (!contentG || tw !== gTargetW || th !== gTargetH) {
    contentG = createGraphics(tw, th);
    finalG = createGraphics(tw, th);
    containG = createGraphics(tw, th);

    maskG = createGraphics(tw, th);
    maskG.noSmooth();
    maskG.drawingContext.imageSmoothingEnabled = false;

    asciiOutG = createGraphics(tw, th);

    camFrameImg = createImage(tw, th);

    gTargetW = tw;
    gTargetH = th;
  }
}

function ensureInternalMaskBuffers(refW, refH) {
  const internalW = INTERNAL_MASK_WIDTH;
  const internalH = max(1, floor((refH / refW) * internalW));

  if (!maskInternalG || maskInternalG.width !== internalW || maskInternalG.height !== internalH) {
    maskInternalG = createGraphics(internalW, internalH);
    maskInternalG.noStroke();
  }
}

function ensureSmallImg(pixelW, pixelH) {
  if (!smallImg || smallImg.width !== pixelW || smallImg.height !== pixelH) {
    smallImg = createImage(pixelW, pixelH);
  }
}

function getCaptureSourceDims() {
  const sw =
    (capture && capture.width) ||
    (capture && capture.elt && capture.elt.videoWidth) ||
    0;
  const sh =
    (capture && capture.height) ||
    (capture && capture.elt && capture.elt.videoHeight) ||
    0;
  return { sw, sh };
}

// ------------------------------------------------------------
// preload / setup
// ------------------------------------------------------------
function preload() {
  baseImg1 = loadImage("assets/base_1.png");
  baseImg2 = loadImage("assets/base_2.png");

  imageQ = loadImage("assets/image_q.png");
  imageW = loadImage("assets/image_w.png");
  imageE = loadImage("assets/image_e.png");
  imageR = loadImage("assets/image_r.png");
  imageT = loadImage("assets/image_t.png");

  overlays["Q"] = loadImage("assets/overlay_Q.png");
  overlays["W"] = loadImage("assets/overlay_W.png");
  overlays["E"] = loadImage("assets/overlay_E.png");
  overlays["R"] = loadImage("assets/overlay_R.png");
  overlays["T"] = loadImage("assets/overlay_T.png");
  overlays["A"] = loadImage("assets/overlay_A.png");
  overlays["S"] = loadImage("assets/overlay_S.png");
  overlays["D"] = loadImage("assets/overlay_D.png");
  overlays["F"] = loadImage("assets/overlay_F.png");
  overlays["G"] = loadImage("assets/overlay_G.png");
  overlays["Y"] = loadImage("assets/overlay_Y.png");
  overlays["X"] = loadImage("assets/overlay_X.png");
  overlays["C"] = loadImage("assets/overlay_C.png");
  overlays["V"] = loadImage("assets/overlay_V.png");
  overlays["B"] = loadImage("assets/overlay_B.png");

  overlayN = loadImage("assets/overlay_n.png");
  overlayH = loadImage("assets/overlay_h.png");


  explainImg = loadImage("assets/explain.png");
  handImg = loadImage("assets/hands.png");
  naviImg = loadImage("assets/navi.png");
}

function setup() {
  createCanvas9x16();
  textFont("sans-serif");
  captureWebcam();

  palette = paletteHex.map((col) => color(col));
  asciiColors = palette.map((c) => `rgba(${red(c)}, ${green(c)}, ${blue(c)}, ${alpha(c)})`);

  asciiBuffer = createGraphics(1, 1);
  asciiBuffer.textAlign(CENTER, CENTER);

  noStroke();

  // Images einmalig “gegen-flippen”
  if (imageQ) imageQf = makeFlippedImage(imageQ);
  if (imageW) imageWf = makeFlippedImage(imageW);
  if (imageE) imageEf = makeFlippedImage(imageE);
  if (imageR) imageRf = makeFlippedImage(imageR);
  if (imageT) imageTf = makeFlippedImage(imageT);

  // Cursor Autohide (funktioniert auch mit F11)
  armCursorAutoHideNoFullscreenCheck();

  lastHandsSeenMs = millis();
}

// ------------------------------------------------------------
// draw
// ------------------------------------------------------------
function draw() {
  background("#0a140aff");

  drawingContext.imageSmoothingEnabled = false;
  noSmooth();

  if (!capture) return;
  if (!hideBase && baseImg1) image(baseImg1, 0, 0, width, height);

  const hands = mediaPipe.landmarks || [];
  if (hands.length > 0) {
    lastHandsSeenMs = millis();
  }

  const isImageMode = "QWERT".includes(currentMode);

  if (!dispW || !dispH) return;

  const targetW = dispW;
  const targetH = dispH;
  const targetX = offsetX;
  const targetY = offsetY;

  const mirrorCanvas = true;
  const flipHandInput = false;

  ensureTargetBuffers(targetW, targetH);

  // CONTENT bauen
  let renderSourceDrawable = null;

  if (isImageMode) {
    const imgMap = { Q: imageQf, W: imageWf, E: imageEf, R: imageRf, T: imageTf };
    const img = imgMap[currentMode];
    if (!img) return;

    fitImageContainToGraphics(img, containG, gTargetW, gTargetH);
    renderSourceDrawable = containG;
  } else {
    renderSourceDrawable = generateWebcamContentDrawable(gTargetW, gTargetH);
  }

  // MASKE (wieder identisch für ALLE Modi, kein Herz-Sonderfall)
  buildUniversalMaskToGraphics(hands, gTargetW, gTargetH, flipHandInput, 1, gTargetW, gTargetH);

  // MASK-APPLY (Canvas compositing)
  finalG.clear();
  finalG.image(renderSourceDrawable, 0, 0, gTargetW, gTargetH);

  const fctx = finalG.drawingContext;
  fctx.save();
  fctx.globalCompositeOperation = "destination-in";
  finalG.image(maskG, 0, 0, gTargetW, gTargetH);
  fctx.restore();

  // DRAW (mirror)
  push();
  if (mirrorCanvas) {
    translate(targetX + targetW, targetY);
    scale(-1, 1);
    image(finalG, 0, 0, targetW, targetH);
  } else {
    translate(targetX, targetY);
    image(finalG, 0, 0, targetW, targetH);
  }
  pop();

  if (!hideBase && baseImg2) image(baseImg2, 0, 0, width, height);

  if (missingMessage !== "") {
    fill("#000000");
    textSize(64);
    textAlign(CENTER, CENTER);
    text(missingMessage, width / 2, height / 2);
  }

  // Navi unter die Mode-Overlays
  if (naviImg) image(naviImg, 0, 0, width, height);

  const ov = overlays[currentMode];
  if (ov) image(ov, 0, 0, width, height);

  // ✅ Status-Overlays
  if (hideBase && overlayN) image(overlayN, 0, 0, width, height);
  if (showHandOverlay && overlayH) image(overlayH, 0, 0, width, height);

  // Explain overlay: erst nach Delay + Fade
  if (explainImg) {
    const noHandsMs = millis() - lastHandsSeenMs;

    if (noHandsMs >= EXPLAIN_DELAY_MS) {
      let a = 255;
      if (EXPLAIN_FADE_MS > 0) {
        a = 255 * constrain((noHandsMs - EXPLAIN_DELAY_MS) / EXPLAIN_FADE_MS, 0, 1);
      }

      push();
      tint(255, a);
      image(explainImg, 0, 0, width, height);
      pop();
    }
  }

  // Hand overlay: per Taste H
  if (showHandOverlay && handImg) {
    image(handImg, 0, 0, width, height);
  }
}

// ------------------------------------------------------------
// HELPER: einmaliges horizontales Flip für p5.Image
// ------------------------------------------------------------
function makeFlippedImage(img) {
  const g = createGraphics(img.width, img.height);
  g.push();
  g.translate(img.width, 0);
  g.scale(-1, 1);
  g.image(img, 0, 0);
  g.pop();
  return g.get();
}

// ------------------------------------------------------------
// HELPER: Bild "contain" (kein Crop) -> in vorhandenes Graphics schreiben
// ------------------------------------------------------------
function fitImageContainToGraphics(img, outG, outW, outH) {
  const srcAR = img.width / img.height;
  const dstAR = outW / outH;

  let dw, dh, dx, dy;

  if (srcAR > dstAR) {
    dw = outW;
    dh = floor(outW / srcAR);
    dx = 0;
    dy = floor((outH - dh) / 2);
  } else {
    dh = outH;
    dw = floor(outH * srcAR);
    dy = 0;
    dx = floor((outW - dw) / 2);
  }

  outG.clear();
  outG.image(img, dx, dy, dw, dh);
}

// ------------------------------------------------------------
// CORE: MASKE (keine V-Sonderbehandlung mehr)
// ------------------------------------------------------------
function buildUniversalMaskToGraphics(
  hands,
  finalW,
  finalH,
  flipHandCoords,
  sizeComp = 1,
  refW = finalW,
  refH = finalH
) {
  ensureInternalMaskBuffers(refW, refH);

  const internalW = maskInternalG.width;
  const internalH = maskInternalG.height;

  maskInternalG.clear();
  maskInternalG.noStroke();
  maskInternalG.fill(255);

  const step = max(1, round(maskPixelSize * sizeComp));
  const z = frameCount * 0.005;

  const localMaxDist = maxDist * maskScale * sizeComp;

  hands.forEach((hand) => {
    const poly = tipIndices.map((i) => ({
      x: (flipHandCoords ? 1 - hand[i].x : hand[i].x) * internalW,
      y: hand[i].y * internalH,
    }));

    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;

    for (let x = 0; x < internalW; x += step) {
      for (let y = 0; y < internalH; y += step) {
        const d = dist(x, y, cx, cy);
        if (d > localMaxDist) continue;

        const density = map(d, 0, localMaxDist, densityNear, densityFar);
        const n = noise(x * scaleN, y * scaleN, z);

        if (n < density) {
          maskInternalG.rect(x, y, step + 1, step + 1);
        }
      }
    }
  });

  // Output auf Zielgröße skalieren (nearest)
  maskG.clear();
  maskG.noSmooth();
  maskG.drawingContext.imageSmoothingEnabled = false;
  maskG.image(maskInternalG, 0, 0, floor(finalW), floor(finalH));
}

// ------------------------------------------------------------
// CONTENT: Webcam/ASCII
// (Herz-Mode V wieder ohne HEART_TEXT_SCALE / HEART_BORDER_CELLS)
// ------------------------------------------------------------
function generateWebcamContentDrawable(w, h) {
  if ("ASDFG".includes(currentMode)) {
    const { sw, sh } = getCaptureSourceDims();
    if (!sw || !sh) {
      contentG.clear();
      return contentG;
    }

    camFrameImg.copy(capture, 0, 0, sw, sh, 0, 0, floor(w), floor(h));

    if (currentMode === "A") {
      camFrameImg.filter(GRAY);
      return camFrameImg;
    } else if (currentMode === "S") {
      return createGrayscalePixelatedToGraphics(camFrameImg, w, h);
    } else if (currentMode === "D") {
      return createColorPixelatedToGraphics(camFrameImg, w, h, palette[3]);
    } else if (currentMode === "F") {
      return createPalettePixelatedToGraphics(camFrameImg, w, h);
    } else if (currentMode === "G") {
      return createInvertPixelatedToGraphics(camFrameImg, w, h);
    }

    return camFrameImg;
  }

  if ("YXCVB".includes(currentMode)) {
    const charset =
      currentMode === "B"
        ? asciiCharB
        : currentMode === "X"
        ? asciiCharJa
        : currentMode === "C"
        ? asciiCharGeo
        : currentMode === "V"
        ? asciiCharEmoji
        : asciiCharDe;

    const cols = floor(capture.width / asciiPixelSize);
    const rows = floor(capture.height / asciiPixelSize);

    const cell = asciiPixelSize * asciiRenderScale;
    const bufW = max(1, cols * cell);
    const bufH = max(1, rows * cell);

    if (!asciiBuffer || asciiBuffer.width !== bufW || asciiBuffer.height !== bufH) {
      asciiBuffer = createGraphics(bufW, bufH);
      asciiBuffer.textAlign(CENTER, CENTER);
    }

    asciiBuffer.clear();
    asciiBuffer.textAlign(CENTER, CENTER);
    asciiBuffer.textFont("monospace");

    // ✅ wieder wie früher: Herz ohne extra Scale / ohne Rand-Cells
    const forceChar = currentMode === "V" ? "❤" : null;
    asciiBuffer.textSize(cell * 1.0);

    drawAsciiToGraphicsFast(
      capture,
      asciiBuffer,
      cols,
      rows,
      charset,
      cell,
      forceChar
    );

    asciiOutG.clear();
    asciiOutG.drawingContext.imageSmoothingEnabled = true;
    asciiOutG.image(asciiBuffer, 0, 0, floor(w), floor(h));
    return asciiOutG;
  }

  contentG.clear();
  return contentG;
}

// ------------------------------------------------------------
// Pixelate helpers
// ------------------------------------------------------------
function createGrayscalePixelatedToGraphics(img, targetW, targetH) {
  const pixelW = max(8, floor(INTERNAL_MASK_WIDTH / max(1, pixelateBlockSize)));
  const pixelH = max(8, int((pixelW * targetH) / targetW));

  ensureSmallImg(pixelW, pixelH);

  smallImg.copy(img, 0, 0, img.width, img.height, 0, 0, pixelW, pixelH);
  smallImg.filter(GRAY);

  contentG.clear();
  contentG.noSmooth();
  contentG.drawingContext.imageSmoothingEnabled = false;
  contentG.image(smallImg, 0, 0, floor(targetW), floor(targetH));
  return contentG;
}

function createColorPixelatedToGraphics(img, targetW, targetH, col) {
  const pixelW = max(8, floor(INTERNAL_MASK_WIDTH / max(1, pixelateBlockSize)));
  const pixelH = max(8, int((pixelW * targetH) / targetW));

  ensureSmallImg(pixelW, pixelH);
  smallImg.copy(img, 0, 0, img.width, img.height, 0, 0, pixelW, pixelH);

  const rc = red(col);
  const gc = green(col);
  const bc = blue(col);

  smallImg.loadPixels();
  for (let i = 0; i < smallImg.pixels.length; i += 4) {
    const r = smallImg.pixels[i];
    const g = smallImg.pixels[i + 1];
    const b = smallImg.pixels[i + 2];
    const bright = (r + g + b) / 3;

    smallImg.pixels[i] = rc;
    smallImg.pixels[i + 1] = gc;
    smallImg.pixels[i + 2] = bc;
    smallImg.pixels[i + 3] = bright;
  }
  smallImg.updatePixels();

  contentG.clear();
  contentG.noSmooth();
  contentG.drawingContext.imageSmoothingEnabled = false;
  contentG.image(smallImg, 0, 0, floor(targetW), floor(targetH));
  return contentG;
}

function createPalettePixelatedToGraphics(img, targetW, targetH) {
  const pixelW = max(8, floor(INTERNAL_MASK_WIDTH / max(1, pixelateBlockSize)));
  const pixelH = max(8, int((pixelW * targetH) / targetW));

  ensureSmallImg(pixelW, pixelH);
  smallImg.copy(img, 0, 0, img.width, img.height, 0, 0, pixelW, pixelH);

  smallImg.loadPixels();
  for (let i = 0; i < smallImg.pixels.length; i += 4) {
    const r = smallImg.pixels[i];
    const g = smallImg.pixels[i + 1];
    const b = smallImg.pixels[i + 2];

    const bright = 0.299 * r + 0.587 * g + 0.114 * b;
    const idx = constrain(floor(map(bright, 0, 255, 0, palette.length)), 0, palette.length - 1);

    const c = palette[idx];
    smallImg.pixels[i] = red(c);
    smallImg.pixels[i + 1] = green(c);
    smallImg.pixels[i + 2] = blue(c);
  }
  smallImg.updatePixels();

  contentG.clear();
  contentG.noSmooth();
  contentG.drawingContext.imageSmoothingEnabled = false;
  contentG.image(smallImg, 0, 0, floor(targetW), floor(targetH));
  return contentG;
}

function createInvertPixelatedToGraphics(img, targetW, targetH) {
  const pixelW = max(8, floor(INTERNAL_MASK_WIDTH / max(1, pixelateBlockSize)));
  const pixelH = max(8, int((pixelW * targetH) / targetW));

  ensureSmallImg(pixelW, pixelH);
  smallImg.copy(img, 0, 0, img.width, img.height, 0, 0, pixelW, pixelH);

  smallImg.loadPixels();
  for (let i = 0; i < smallImg.pixels.length; i += 4) {
    smallImg.pixels[i] = 255 - smallImg.pixels[i];
    smallImg.pixels[i + 1] = 255 - smallImg.pixels[i + 1];
    smallImg.pixels[i + 2] = 255 - smallImg.pixels[i + 2];
  }
  smallImg.updatePixels();

  contentG.clear();
  contentG.noSmooth();
  contentG.drawingContext.imageSmoothingEnabled = false;
  contentG.image(smallImg, 0, 0, floor(targetW), floor(targetH));
  return contentG;
}

// ------------------------------------------------------------
// ASCII fast render
// ------------------------------------------------------------
function ensureAsciiSampling(cols, rows, sw, sh) {
  const c = asciiSampleCache;
  if (c.cols === cols && c.rows === rows && c.sw === sw && c.sh === sh && c.sx && c.sy) return;

  c.cols = cols;
  c.rows = rows;
  c.sw = sw;
  c.sh = sh;

  c.sx = new Array(cols);
  c.sy = new Array(rows);

  for (let i = 0; i < cols; i++) c.sx[i] = int((i * sw) / cols);
  for (let j = 0; j < rows; j++) c.sy[j] = int((j * sh) / rows);
}

function drawAsciiToGraphicsFast(src, pg, cols, rows, charset, cellSize, forceChar = null) {
  src.loadPixels();

  const sw = src.width;

  ensureAsciiSampling(cols, rows, sw, src.height);
  const sxArr = asciiSampleCache.sx;
  const syArr = asciiSampleCache.sy;

  const chars = forceChar ? null : Array.from(charset);
  const charLen = chars ? chars.length : 0;
  const colorLen = asciiColors.length;

  for (let j = 0; j < rows; j++) {
    const sy = syArr[j];
    for (let i = 0; i < cols; i++) {
      const sx = sxArr[i];
      const idx = (sx + sy * sw) * 4;

      const bright = (src.pixels[idx] + src.pixels[idx + 1] + src.pixels[idx + 2]) / 3;

      let ch;
      if (forceChar) {
        ch = forceChar;
      } else {
        const charIdx = floor((charLen - 1) - (bright * (charLen - 1)) / 255);
        ch = chars[charIdx];
      }

      const colorIdx = floor((bright * (colorLen - 1)) / 255);
      pg.fill(asciiColors[colorIdx]);
      pg.text(ch, (i + 0.5) * cellSize, (j + 0.5) * cellSize);
    }
  }
}

// ------------------------------------------------------------
// CAMERA / CANVAS
// ------------------------------------------------------------
function captureWebcam() {
  capture = createCapture({ audio: false, video: { facingMode: "user" } }, (e) => {
    captureEvent = e;
    setCameraDimensions(capture);
    mediaPipe.predictWebcam(capture);
  });
  capture.hide();
}

function setCameraDimensions(video) {
  const vidAR = video.width / video.height;
  const canvasAR = width / height;

  if (vidAR > canvasAR) {
    video.scaledHeight = height;
    video.scaledWidth = height * vidAR;
  } else {
    video.scaledWidth = width;
    video.scaledHeight = width / vidAR;
  }

  dispW = video.scaledWidth * displayScale;
  dispH = video.scaledHeight * displayScale;
  offsetX = (width - dispW) / 2;
  offsetY = (height - dispH) / 2;
}

function createCanvas9x16() {
  let h = windowHeight;
  let w = h * (9 / 16);
  if (w > windowWidth) {
    w = windowWidth;
    h = w * (16 / 9);
  }
  createCanvas(floor(w), floor(h));
}

function windowResized() {
  createCanvas9x16();
  if (capture) setCameraDimensions(capture);
}

function keyPressed() {
  const keyUpper = key.toUpperCase();

  if (keyUpper === "N") {
    hideBase = !hideBase;
    return;
  }

  // Toggle Hand overlay
  if (keyUpper === "H") {
    showHandOverlay = !showHandOverlay;
    return;
  }

  if ("ASDFGYXCVBQWERT".includes(keyUpper)) {
    currentMode = keyUpper;
    missingMessage = "";
  }
}

// ------------------------------------------------------------
// Cursor Auto-hide (funktioniert auch mit F11)
// ------------------------------------------------------------
let cursorTimer = null;
const HIDE_AFTER_MS = 1200;

function showCursor() {
  document.documentElement.classList.remove("cursor-hidden");
  if (typeof cursor === "function") cursor(ARROW);
}

function hideCursor() {
  document.documentElement.classList.add("cursor-hidden");
  if (typeof noCursor === "function") noCursor();
}

function armCursorAutoHideNoFullscreenCheck() {
  function scheduleHide() {
    clearTimeout(cursorTimer);
    showCursor();
    cursorTimer = setTimeout(hideCursor, HIDE_AFTER_MS);
  }

  // nur Maus/Touch blendet Cursor ein
  ["mousemove", "mousedown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, scheduleHide, { passive: true });
  });

  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(hideCursor, HIDE_AFTER_MS);
}
