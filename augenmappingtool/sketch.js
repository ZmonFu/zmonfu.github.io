let canvas;
let circles = [];
let currentCircle = null;
let grundriss;
let imgAspect;
let scaleSpeed = 1;
let rightMouseDown = false;
let currentGrundrissName = "hagemann"; // Standardwert

let selectedMovement = "zu Fuss";
let selectedAge = "Erwachsener (19-60)";

let ageFillColors = {
  "Kind (0-12)": "#000000ff",
  "Jugendlicher (12-18)": "#000000ff",
  "Erwachsener (19-60)": "#000000ff",
  "Senior:in (61-99)": "#000000ff"
};

let movementStrokeColors = {
  "zu Fuss": "#F8F9FA",
  "Fahrrad": "#3ed357ff",
  "Auto": "#f34c4cff",
  "mit Kinderwagen": "#ffbe25ff",
  "Rollator/Rollstuhl": "#5a28efff",
  "Motorrad/Moped": "#0909bcff",
  "Sonstiges": "#fe3f82ff"
};

function convertToGrayscale(img) {
  img.filter(GRAY);
  return img;
}

function preload() {
  grundriss = loadImage('images/Hagemann.jpg', (img) => {
    grundriss = convertToGrayscale(img);
  });
}

function setup() {
  imgAspect = grundriss.width / grundriss.height;
  canvas = createCanvas(100, 100);
  calculateCanvasSize();
  noCursor();
  document.oncontextmenu = () => false;

  let uploadButton = select("#upload");
  uploadButton.changed(() => {
    let file = uploadButton.elt.files[0];
    if (file && file.type.startsWith("image/")) {
      currentGrundrissName = file.name.split(".")[0];
      let reader = new FileReader();
      reader.onload = (e) => {
        loadImage(e.target.result, (img) => {
          grundriss = convertToGrayscale(img);
          imgAspect = img.width / img.height;
          calculateCanvasSize();
        });
      };
      reader.readAsDataURL(file);
    }
  });

  let ageDropdown = select("#ageSelect");
  ageDropdown.changed(() => {
    selectedAge = ageDropdown.value();
  });

  let movementDropdown = select("#movementSelect");
  movementDropdown.changed(() => {
    selectedMovement = movementDropdown.value();
  });

let saveButton = select("#saveBtn");
saveButton.mousePressed(() => {
  const age = selectedAge.split(" ")[0]; // z.B. "Erwachsener"

  const usedMovements = circles
    .filter(c => c.movement)
    .map(c => c.movement.replace(/[^a-zA-Z0-9]/g, "").replace("ß", "ss"));

  const uniqueMovements = [...new Set(usedMovements)];
  const movementPart = uniqueMovements.length > 0 ? uniqueMovements.join("_") : "keineAngabe";

  const grundrissCapitalized = currentGrundrissName.charAt(0).toUpperCase() + currentGrundrissName.slice(1);

  const filename = `AugenMappingTool_${grundrissCapitalized}_${age}_${movementPart}.jpg`;
  save(canvas, filename);
});




  let resetButton = select("#resetBtn");
  resetButton.mousePressed(() => {
    circles = [];
  });

  let exampleDropdown = select("#exampleSelect");
  exampleDropdown.changed(() => {
    let selectedFile = exampleDropdown.value();
    currentGrundrissName = selectedFile.split(".")[0];
    loadImage(`images/${selectedFile}`, (img) => {
      grundriss = convertToGrayscale(img);
      imgAspect = img.width / img.height;
      calculateCanvasSize();
    });
  });
}

function draw() {
  background(0);

  tint(255);
  image(grundriss, 0, 0, width, height);
  noTint();

  fill("rgba(0, 0, 0, 0.8)");
  noStroke();
  rect(0, 0, width, height);

  repelCircles();

  if (mouseIsPressed && mouseY <= height) {
    if (currentCircle === null) {
      for (let c of circles) {
        let dx = mouseX - c.x;
        let dy = mouseY - c.y;
        let distance = sqrt(dx * dx + dy * dy);
        if (distance < c.d / 2) {
          currentCircle = c;
          break;
        }
      }
    }

    if (currentCircle !== null) {
      if (mouseButton === LEFT) {
        currentCircle.d += scaleSpeed;
      } else if (mouseButton === RIGHT) {
        currentCircle.d -= scaleSpeed;
        if (currentCircle.d < 10) currentCircle.d = 10;
      }
    } else {
      currentCircle = {
        x: mouseX,
        y: mouseY,
        d: 10,
        vx: 0,
        vy: 0,
        fill: movementStrokeColors[selectedMovement] || "#FF69B4",
        pupil: ageFillColors[selectedAge] || "#000000",
        age: selectedAge,
        movement: selectedMovement
      };
      circles.push(currentCircle);
    }
  } else {
    currentCircle = null;
  }

  for (let c of circles) {
    c.x += c.vx;
    c.y += c.vy;
    c.vx *= 0.9;
    c.vy *= 0.9;
    applyCircleStyles(c);
  }

  fill('#000000ff');
  noStroke();
  ellipse(mouseX, mouseY, 10, 10);
}

function applyCircleStyles(c) {
  const age = c.age || "Erwachsener (19-60)";

  noStroke();
  fill(c.fill || "#FFFFFF");
  ellipse(c.x, c.y, c.d, c.d);

  let pupilSize = c.d * 0.5;
  let dx = mouseX - c.x;
  let dy = mouseY - c.y;
  let distToMouse = sqrt(dx * dx + dy * dy);
  let maxOffset = (c.d - pupilSize) / 2;

  if (distToMouse > maxOffset) {
    let angle = atan2(dy, dx);
    dx = cos(angle) * maxOffset;
    dy = sin(angle) * maxOffset;
  }

  if (age === "Senior:in (61-99)") {
    fill('#484848ff'); // Graue Pupille
  } else {
    fill(c.pupil || "#000000");
  }

  noStroke();
  ellipse(c.x + dx, c.y + dy, pupilSize, pupilSize);

  if (age === "Jugendlicher (12-18)") {
    noStroke();
    const movementColor = movementStrokeColors[c.movement] || '#FFFFFF';
    fill(movementColor);
    arc(c.x, c.y, c.d, c.d, PI, 0, CHORD);
    stroke('#000');
    strokeWeight(2);
    line(c.x - c.d / 2, c.y, c.x + c.d / 2, c.y);
  }

  if (age === "Kind (0-12)") {
    let lashRadius = c.d / 2 + 2;
    let lashLength = c.d * 0.15;
    stroke(0);
    strokeWeight(2);
    let angles = [-PI / 3, -PI / 2, -2 * PI / 3];
    for (let a of angles) {
      let x1 = c.x + cos(a) * lashRadius;
      let y1 = c.y + sin(a) * lashRadius;
      let x2 = c.x + cos(a) * (lashRadius + lashLength);
      let y2 = c.y + sin(a) * (lashRadius + lashLength);
      line(x1, y1, x2, y2);
    }
  }
}

function repelCircles() {
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      let a = circles[i];
      let b = circles[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = sqrt(dx * dx + dy * dy);
      let minDist = (a.d + b.d) / 2;

      if (distance < minDist) {
        let overlap = minDist - distance;
        if (overlap > 1) {
          let angle = atan2(dy, dx);
          let push = overlap * 0.05;
          a.vx -= cos(angle) * push;
          a.vy -= sin(angle) * push;
          b.vx += cos(angle) * push;
          b.vy += sin(angle) * push;
        }
      }
    }
  }
}

function windowResized() {
  calculateCanvasSize();
}

function calculateCanvasSize() {
  const topbar = select('.topbar');
  const topHeight = topbar ? topbar.elt.offsetHeight : 200;

  const maxWidth = min(windowWidth * 0.9, grundriss.width);
  const maxHeight = windowHeight - topHeight;

  const scaledHeight = maxWidth / imgAspect;

  let canvasWidth = maxWidth;
  let canvasHeight = scaledHeight;

  if (scaledHeight > maxHeight) {
    canvasHeight = maxHeight;
    canvasWidth = canvasHeight * imgAspect;
  }

  resizeCanvas(canvasWidth, canvasHeight);

  let wrapper = select('.canvas-wrapper');
  if (wrapper) {
    canvas.parent(wrapper.elt);
  }
}
