const imageFileInput = document.querySelector("#imageFileInput");
const topTextInput = document.querySelector("#topTextInput");
const bottomTextInput = document.querySelector("#bottomTextInput");
const canvas = document.querySelector("#meme");
const colorInput = document.querySelector("#textColor");
const outlineColorInput = document.querySelector("#outlineColor");
const fontSizeInput = document.querySelector("#fontSize");
const fontSelector = document.querySelector("#font");
const downloadButton = document.querySelector("#downloadMeme");
const resetMemeButton = document.querySelector("#resetMeme");

let image = null; // Initialize to null

// Current X and Y offsets for text positions
let topTextXOffset;
let topTextYOffset;
let bottomTextXOffset;
let bottomTextYOffset;

// Dragging state variables
let draggingText = null; // 'top', 'bottom', or null
let initialMouseX; // Mouse X position when drag started (scaled)
let initialMouseY; // Mouse Y position when drag started (scaled)
let initialTextX; // Text X position when drag started (either topTextXOffset or bottomTextXOffset)
let initialTextY; // Text Y position when drag started (either topTextYOffset or bottomTextYOffset)

function resetMeme() {
  image = null;
  canvas.width = 0;
  canvas.height = 0;
  topTextInput.value = "";
  bottomTextInput.value = "";
  colorInput.value = "#ffffff";
  outlineColorInput.value = "#000000";
  fontSizeInput.value = "40";
  fontSelector.value = "impact";

  // Reset text offsets to undefined, so they recalculate to default on next image load
  topTextXOffset = undefined;
  topTextYOffset = undefined;
  bottomTextXOffset = undefined;
  bottomTextYOffset = undefined;

  draggingText = null;
  clearCanvas();
  console.log("Meme reset.");
}

resetMemeButton.addEventListener("click", resetMeme);

imageFileInput.addEventListener("change", () => {
  const imageDataUrl = URL.createObjectURL(imageFileInput.files[0]);

  image = new Image();
  image.src = imageDataUrl;
  image.addEventListener(
    "load",
    () => {
      // Set canvas dimensions to image dimensions
      canvas.width = image.width;
      canvas.height = image.height;

      // Initialize X and Y offsets based on image dimensions
      // Default to center X, and default top/bottom Y
      topTextXOffset = canvas.width / 2;
      topTextYOffset = canvas.height / 25;
      bottomTextXOffset = canvas.width / 2;
      bottomTextYOffset = canvas.height - canvas.height / 25;

      updateMemeCanvas();
      console.log("Image loaded. Canvas size:", canvas.width, canvas.height);
      console.log("Initial Top Text Offsets:", topTextXOffset, topTextYOffset);
      console.log(
        "Initial Bottom Text Offsets:",
        bottomTextXOffset,
        bottomTextYOffset
      );
    },
    { once: true }
  );
});

topTextInput.addEventListener("input", updateMemeCanvas);
bottomTextInput.addEventListener("input", updateMemeCanvas);
colorInput.addEventListener("input", updateMemeCanvas);
outlineColorInput.addEventListener("input", updateMemeCanvas);
fontSizeInput.addEventListener("input", updateMemeCanvas);
fontSelector.addEventListener("change", updateMemeCanvas);

downloadButton.addEventListener("click", () => {
  if (canvas.width > 0 && canvas.height > 0) {
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "meme.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log("Meme downloaded.");
  } else {
    alert("Please select an image first.");
  }
});

// --- Helper to get scaled mouse coordinates ---
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect(); // Get canvas size and position relative to viewport
  const scaleX = canvas.width / rect.width; // Ratio of canvas internal width to its CSS width
  const scaleY = canvas.height / rect.height; // Ratio of canvas internal height to its CSS height

  // Return mouse position adjusted for canvas scaling
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

// --- Dragging Functionality ---

/**
 * Checks if the mouse coordinates are over the given text.
 * Uses more accurate TextMetrics properties for height.
 * @param {number} mouseX - Mouse X coordinate relative to canvas (SCALED).
 * @param {number} mouseY - Mouse Y coordinate relative to canvas (SCALED).
 * @param {string} text - The text string.
 * @param {number} textXPos - The X position where the text is drawn.
 * @param {number} textYPos - The Y position where the text is drawn.
 * @param {CanvasRenderingContext2D} context - The canvas 2D rendering context.
 * @returns {boolean} True if mouse is over text, false otherwise.
 */
function isMouseOverText(mouseX, mouseY, text, textXPos, textYPos, context) {
  if (!text) return false;

  const textMetrics = context.measureText(text);
  const actualTextWidth = textMetrics.width;
  const actualTextHeight =
    textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

  // Calculate text bounding box based on textAlign
  let xStart;
  if (context.textAlign === "center") {
    xStart = textXPos - actualTextWidth / 2;
  } else if (context.textAlign === "left") {
    xStart = textXPos;
  } else {
    // right
    xStart = textXPos - actualTextWidth;
  }
  const xEnd = xStart + actualTextWidth;

  // Calculate text bounding box based on textBaseline
  let yStart;
  if (context.textBaseline === "top") {
    yStart = textYPos;
  } else if (context.textBaseline === "bottom") {
    yStart = textYPos - actualTextHeight;
  } else if (context.textBaseline === "middle") {
    yStart = textYPos - actualTextHeight / 2;
  } else {
    // alphabetic, etc. - fallback to ascent
    yStart = textYPos - textMetrics.actualBoundingBoxAscent;
  }
  const yEnd = yStart + actualTextHeight;

  const padding = 10; // Increased padding for easier clicking

  const hit =
    mouseX >= xStart - padding &&
    mouseX <= xEnd + padding &&
    mouseY >= yStart - padding &&
    mouseY <= yEnd + padding;

  return hit;
}

canvas.addEventListener("mousedown", (e) => {
  if (!image) return;

  const mousePos = getMousePos(canvas, e); // Get scaled mouse coordinates
  const mouseX = mousePos.x;
  const mouseY = mousePos.y;
  const contxt = canvas.getContext("2d");
  const fontSize = parseInt(fontSizeInput.value);
  contxt.font = `${fontSize}px ${fontSelector.value}`; // Set font for accurate text measurement

  console.log(
    "Mousedown event fired at (scaled):",
    mouseX.toFixed(2),
    mouseY.toFixed(2)
  );

  // Check if mouse is over top text
  contxt.textBaseline = "top";
  const currentTopY = topTextYOffset;
  const currentTopX = topTextXOffset; // Get current X for hit detection
  if (
    isMouseOverText(
      mouseX,
      mouseY,
      topTextInput.value,
      currentTopX, // Pass current X
      currentTopY,
      contxt
    )
  ) {
    draggingText = "top";
    initialMouseX = mouseX; // Store scaled mouse X
    initialMouseY = mouseY; // Store scaled mouse Y
    initialTextX = currentTopX; // Store text's X position
    initialTextY = currentTopY; // Store text's Y position
    canvas.style.cursor = "grabbing";
    console.log("Dragging TOP text started.");
    return; // Stop here, we found what to drag
  }

  // Check if mouse is over bottom text
  contxt.textBaseline = "bottom";
  const currentBottomY = bottomTextYOffset;
  const currentBottomX = bottomTextXOffset; // Get current X for hit detection
  if (
    isMouseOverText(
      mouseX,
      mouseY,
      bottomTextInput.value,
      currentBottomX, // Pass current X
      currentBottomY,
      contxt
    )
  ) {
    draggingText = "bottom";
    initialMouseX = mouseX; // Store scaled mouse X
    initialMouseY = mouseY; // Store scaled mouse Y
    initialTextX = currentBottomX; // Store text's X position
    initialTextY = currentBottomY; // Store text's Y position
    canvas.style.cursor = "grabbing";
    console.log("Dragging BOTTOM text started.");
    return; // Stop here, we found what to drag
  }

  // If no text was hit
  draggingText = null;
  canvas.style.cursor = "default";
  console.log("No text clicked.");
});

canvas.addEventListener("mousemove", (e) => {
  const mousePos = getMousePos(canvas, e); // Get scaled mouse coordinates
  const mouseX = mousePos.x;
  const mouseY = mousePos.y;
  const contxt = canvas.getContext("2d");
  const fontSize = parseInt(fontSizeInput.value);
  contxt.font = `${fontSize}px ${fontSelector.value}`;

  // If not dragging, handle cursor change on hover
  if (!draggingText && image) {
    contxt.textBaseline = "top";
    const topX =
      topTextXOffset !== undefined ? topTextXOffset : canvas.width / 2;
    const topY =
      topTextYOffset !== undefined ? topTextYOffset : canvas.height / 25;
    if (
      isMouseOverText(mouseX, mouseY, topTextInput.value, topX, topY, contxt)
    ) {
      canvas.style.cursor = "grab";
      return;
    }

    contxt.textBaseline = "bottom";
    const bottomX =
      bottomTextXOffset !== undefined ? bottomTextXOffset : canvas.width / 2;
    const bottomY =
      bottomTextYOffset !== undefined
        ? bottomTextYOffset
        : canvas.height - canvas.height / 25;
    if (
      isMouseOverText(
        mouseX,
        mouseY,
        bottomTextInput.value,
        bottomX,
        bottomY,
        contxt
      )
    ) {
      canvas.style.cursor = "grab";
      return;
    }
    canvas.style.cursor = "default";
    return;
  }

  // If dragging, execute dragging logic
  if (draggingText && image) {
    const currentMouseX = mouseX; // Use scaled mouse X
    const currentMouseY = mouseY; // Use scaled mouse Y
    const deltaX = currentMouseX - initialMouseX;
    const deltaY = currentMouseY - initialMouseY;

    if (draggingText === "top") {
      topTextXOffset = initialTextX + deltaX;
      topTextYOffset = initialTextY + deltaY;
    } else if (draggingText === "bottom") {
      bottomTextXOffset = initialTextX + deltaX;
      bottomTextYOffset = initialTextY + deltaY;
    }
    updateMemeCanvas();
    // console.log("Dragging:", draggingText, "New X:", draggingText === "top" ? topTextXOffset : bottomTextXOffset, "New Y:", draggingText === "top" ? topTextYOffset : bottomTextYOffset);
  }
});

canvas.addEventListener("mouseup", () => {
  if (draggingText) {
    console.log("Dragging stopped.");
  }
  draggingText = null;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseout", () => {
  if (draggingText) {
    console.log("Mouse left canvas while dragging. Dragging stopped.");
    draggingText = null;
  }
  canvas.style.cursor = "default";
});

// --- End Dragging Functionality ---

function updateMemeCanvas() {
  if (!image) {
    clearCanvas();
    return;
  }

  const contxt = canvas.getContext("2d");
  const width = image.width;
  const height = image.height;
  const fontSize = parseInt(fontSizeInput.value);
  const textColor = colorInput.value;
  const outlineColor = outlineColorInput.value;
  const font = fontSelector.value;
  const outlineWidth = Math.floor(fontSize / 8);

  // Set canvas dimensions to image dimensions
  canvas.width = width;
  canvas.height = height;
  contxt.drawImage(image, 0, 0);

  // Prepare text styles
  contxt.strokeStyle = outlineColor;
  contxt.lineWidth = outlineWidth;
  contxt.fillStyle = textColor;
  contxt.textAlign = "center"; // Keep text alignment centered for drawing
  contxt.lineJoin = "round";
  contxt.font = `${fontSize}px ${font}`;

  // Add top text
  contxt.textBaseline = "top";
  // Use the stored topTextXOffset and topTextYOffset
  const finalTopX = topTextXOffset !== undefined ? topTextXOffset : width / 2;
  const finalTopY = topTextYOffset !== undefined ? topTextYOffset : height / 25;
  contxt.strokeText(topTextInput.value, finalTopX, finalTopY);
  contxt.fillText(topTextInput.value, finalTopX, finalTopY);

  // Add bottom text
  contxt.textBaseline = "bottom";
  // Use the stored bottomTextXOffset and bottomTextYOffset
  const finalBottomX =
    bottomTextXOffset !== undefined ? bottomTextXOffset : width / 2;
  const finalBottomY =
    bottomTextYOffset !== undefined ? bottomTextYOffset : height - height / 25;
  contxt.strokeText(bottomTextInput.value, finalBottomX, finalBottomY);
  contxt.fillText(bottomTextInput.value, finalBottomX, finalBottomY);
}

function clearCanvas() {
  const contxt = canvas.getContext("2d");
  contxt.clearRect(0, 0, canvas.width, canvas.height);
}
