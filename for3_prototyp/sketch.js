let canvasRatio = 1524 / 656;
let baseImg;

let overlayLayers = [];
let videoLayers = [];
let status = "Idle";
let videosStarted = false;

let fadeSpeedIn = 12;
let fadeSpeedOut = 12;

const TEXT_ONLY = ["Allgemein", "Pumpen", "Turbinieren"];

// Pumpen‑State
let isPumpenHeld = false;
let isPumpenFadingOut = false;
let pumpenSpeed = 0.2;
let pumpenHoldProgress = 0;

// Turbinieren‑State
let isTurbinierenHeld = false;
let isTurbinierenFadingOut = false;
let turbinierenSpeed = 0.2;
let turbinierenHoldProgress = 0;

function preload() {
    baseImg = loadImage("assets/images/Tisch.png");

    const overlayNames = [
        "Allgemein", "Pumpen", "Turbinieren",
        "Hoehenlinien", "Gewaesser", "Strassen",
        "Fluesse", "Gruenflaechen", "Haeuser", "Kraftwerke"
    ];

    overlayNames.forEach(name => {
        overlayLayers.push({
            name,
            img: TEXT_ONLY.includes(name) ? null : loadImage(`assets/images/${name}.png`),
            textImg: loadImage(`assets/images/${name}_Text.png`),
            active: false
        });
    });

    const allVideos = [
        // Active
        { name: "Sonne_Active", status: "StatusActive" },
        { name: "Wind_Active", status: "StatusActive" },
        { name: "Haeuser_Active", status: "StatusActive" },

        // Pumpen (ohne Sonne_Pumpen)
        { name: "Wind_Pumpen", status: "StatusPumpen" },
        { name: "Wasser_Pumpen", status: "StatusPumpen" },
        { name: "Haeuser_Pumpen", status: "StatusPumpen" },

        // Turbinieren (ohne Wind_Turbinieren)
        { name: "Sonne_Turbinieren", status: "StatusTurbinieren" },
        { name: "Wasser_Turbinieren", status: "StatusTurbinieren" },
        { name: "Haeuser_Turbinieren", status: "StatusTurbinieren" }
    ];

    allVideos.forEach(entry => {
        const vid = createVideo([`assets/videos/${entry.name}.webm`]);
        vid.hide();
        vid.volume(0);

        videoLayers.push({
            name: entry.name,
            video: vid,
            status: entry.status,
            alpha: 0,
            started: false
        });
    });
}

function setup() {
    createCanvas(windowWidth, windowWidth / canvasRatio);
    setupUI();
}

function setupUI() {
    select("#btnStatusIdle").mousePressed(() => switchStatus("Idle"));

    select("#btnStatusActive").mousePressed(() => {
        startAllVideosOnce();
        switchStatus("StatusActive");
    });

    const pumpenBtn = document.getElementById("btnStatusPumpen");
    pumpenBtn.addEventListener("pointerdown", () => {
        startAllVideosOnce();
        switchStatus("StatusPumpen");
        isPumpenHeld = true;
        isPumpenFadingOut = false;
        pumpenSpeed = 0.2;
        pumpenHoldProgress = 0;

        videoLayers.forEach(layer => {
            if (layer.status === "StatusPumpen" || layer.name === "Sonne_Active") {
                layer.video.time(0);
                layer.video.play();
            }
        });
    });
    const stopPumpen = () => {
        if (status === "StatusPumpen") {
            isPumpenHeld = false;
            isPumpenFadingOut = true;
        }
    };
    pumpenBtn.addEventListener("pointerup", stopPumpen);
    pumpenBtn.addEventListener("pointerleave", stopPumpen);
    document.addEventListener("pointerup", stopPumpen);

    const turbinierenBtn = document.getElementById("btnStatusTurbinieren");
    turbinierenBtn.addEventListener("pointerdown", () => {
        startAllVideosOnce();
        switchStatus("StatusTurbinieren");
        isTurbinierenHeld = true;
        isTurbinierenFadingOut = false;
        turbinierenSpeed = 0.2;
        turbinierenHoldProgress = 0;

        videoLayers.forEach(layer => {
            if (layer.status === "StatusTurbinieren" || layer.name === "Wind_Active") {
                layer.video.time(0);
                layer.video.play();
            }
        });
    });
    const stopTurbinieren = () => {
        if (status === "StatusTurbinieren") {
            isTurbinierenHeld = false;
            isTurbinierenFadingOut = true;
        }
    };
    turbinierenBtn.addEventListener("pointerup", stopTurbinieren);
    turbinierenBtn.addEventListener("pointerleave", stopTurbinieren);
    document.addEventListener("pointerup", stopTurbinieren);

    select("#btnReset").mousePressed(resetAll);

    const overlayButtons = [
        "Allgemein", "Pumpen", "Turbinieren",
        "Hoehenlinien", "Gewaesser", "Strassen",
        "Fluesse", "Gruenflaechen", "Haeuser", "Kraftwerke"
    ];
    overlayButtons.forEach(name => {
        select("#btn" + name).mousePressed(() => toggleOverlay(name));
    });
}

function toggleOverlay(name) {
    for (let i = 0; i < overlayLayers.length; i++) {
        const layer = overlayLayers[i];
        if (layer.name === name) {
            layer.active = !layer.active;
            if (layer.active) {
                overlayLayers.push(overlayLayers.splice(i, 1)[0]);
            }
            break;
        }
    }
}

function switchStatus(newStatus) {
    status = newStatus;

    // Reset fading flags
    if (newStatus !== "StatusPumpen") {
        isPumpenHeld = false;
        isPumpenFadingOut = false;

        // 👉 Fortschrittsbalken sofort zurücksetzen
        const prog = document.getElementById("pumpenProgress");
        if (prog) prog.style.width = "0%";
    }

    if (newStatus !== "StatusTurbinieren") {
        isTurbinierenHeld = false;
        isTurbinierenFadingOut = false;

        const prog = document.getElementById("turbinierenProgress");
        if (prog) prog.style.width = "0%";
    }

    videoLayers.forEach(layer => {
        if (layer.status === status) {
            layer.started = false;
        }
    });
}



function startAllVideosOnce() {
    if (videosStarted) return;

    videoLayers.forEach(layer => {
        layer.video.loop();
        layer.video.play();
        layer.started = true;
        layer.alpha = 0;
    });
    videosStarted = true;
}

function resetAll() {
    overlayLayers.forEach(l => l.active = false);

    status = "Idle";
    isPumpenHeld = false;
    isPumpenFadingOut = false;
    isTurbinierenHeld = false;
    isTurbinierenFadingOut = false;

    pumpenSpeed = 0.2;
    pumpenHoldProgress = 0;
    turbinierenSpeed = 0.2;
    turbinierenHoldProgress = 0;

    videoLayers.forEach(layer => {
        layer.alpha = 0;
        layer.started = false;
    });
}

function draw() {
    background(0);

    // 1. Overlay-Bilder (Höhenlinien etc.)
    overlayLayers.forEach(layer => {
        if (layer.active && layer.img) {
            image(layer.img, 0, 0, width, height);
        }
    });

    // 2. Tisch.png maskiert die Overlay-Bilder (nicht die Videos!)
    noTint();
    image(baseImg, 0, 0, width, height);

    // 3. Video-Alpha-Logik
    videoLayers.forEach(layer => {
        const isPumpenVideo = layer.status === "StatusPumpen" || (layer.name === "Sonne_Active" && status === "StatusPumpen");
        const isTurbinierenVideo = layer.status === "StatusTurbinieren" || (layer.name === "Wind_Active" && status === "StatusTurbinieren");

        if (isPumpenVideo) {
            if (isPumpenHeld) {
                layer.alpha = min(layer.alpha + fadeSpeedIn, 255);
            } else if (isPumpenFadingOut) {
                layer.alpha = max(layer.alpha - fadeSpeedOut, 0);
            }
        } else if (isTurbinierenVideo) {
            if (isTurbinierenHeld) {
                layer.alpha = min(layer.alpha + fadeSpeedIn, 255);
            } else if (isTurbinierenFadingOut) {
                layer.alpha = max(layer.alpha - fadeSpeedOut, 0);
            }
        } else if (layer.status === status) {
            layer.alpha = min(layer.alpha + fadeSpeedIn, 255);
        } else {
            layer.alpha = max(layer.alpha - fadeSpeedOut, 0);
        }
    });

    // 4. Videos anzeigen
    videoLayers.forEach(layer => {
        if (layer.alpha > 0) {
            tint(255, layer.alpha);
            image(layer.video, 0, 0, width, height);
        }
    });

    // 5. Overlay-Texte (z. B. Pumpen_Text etc.)
    overlayLayers.forEach(layer => {
        if (layer.active && layer.textImg) {
            noTint();
            image(layer.textImg, 0, 0, width, height);
        }
    });

    // 6. Pumpen-Logik
    if (status === "StatusPumpen") {
        if (isPumpenHeld) {
            pumpenSpeed = min(pumpenSpeed + 0.01, 2);
            pumpenHoldProgress = min(pumpenHoldProgress + 0.0015, 1);
        } else {
            pumpenSpeed = max(pumpenSpeed - 0.01, 1);
            pumpenHoldProgress = max(pumpenHoldProgress - 0.01, 0);
        }

        videoLayers.forEach(layer => {
            if (layer.status === "StatusPumpen" || layer.name === "Sonne_Active") {
                layer.video.speed(pumpenSpeed);
            }
        });

        const prog = document.getElementById("pumpenProgress");
        if (prog) prog.style.width = `${pumpenHoldProgress * 100}%`;
    }

    // 7. Turbinieren-Logik
    if (status === "StatusTurbinieren") {
        if (isTurbinierenHeld) {
            turbinierenSpeed = min(turbinierenSpeed + 0.01, 2);
            turbinierenHoldProgress = min(turbinierenHoldProgress + 0.0015, 1);
        } else {
            turbinierenSpeed = max(turbinierenSpeed - 0.01, 1);
            turbinierenHoldProgress = max(turbinierenHoldProgress - 0.01, 0);
        }

        videoLayers.forEach(layer => {
            if (layer.status === "StatusTurbinieren" || layer.name === "Wind_Active") {
                layer.video.speed(turbinierenSpeed);
            }
        });

        const prog2 = document.getElementById("turbinierenProgress");
        if (prog2) prog2.style.width = `${turbinierenHoldProgress * 100}%`;
    }

    // 8. Automatischer Status-Wechsel bei Fade-Out-Ende
    if (status === "StatusPumpen" && !isPumpenHeld && isPumpenFadingOut) {
        let stillVisible = videoLayers.some(layer =>
            (layer.status === "StatusPumpen" || layer.name === "Sonne_Active") &&
            layer.alpha > 0
        );
        if (!stillVisible) {
            switchStatus("StatusActive");
            isPumpenFadingOut = false;
        }
    }

    if (status === "StatusTurbinieren" && !isTurbinierenHeld && isTurbinierenFadingOut) {
        let stillVisible = videoLayers.some(layer =>
            (layer.status === "StatusTurbinieren" || layer.name === "Wind_Active") &&
            layer.alpha > 0
        );
        if (!stillVisible) {
            switchStatus("StatusActive");
            isTurbinierenFadingOut = false;
        }
    }
}



function windowResized() {
    resizeCanvas(windowWidth, windowWidth / canvasRatio);
}