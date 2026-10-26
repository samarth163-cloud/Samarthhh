const canvas = document.getElementById("resume-pixels");
const context = canvas.getContext("2d");

const startingCells = [
  // verticle pattern, left
  [5, 1],
  [6, 1],
  [5, 2],
  [6, 2],
  [5, 11],
  [6, 11],
  [7, 11],
  [4, 12],
  [8, 12],
  [3, 13],
  [9, 13],
  [3, 14],
  [9, 14],
  [6, 15],
  [4, 16],
  [8, 16],
  [5, 17],
  [6, 17],
  [7, 17],
  [6, 18],
  [3, 21],
  [4, 21],
  [5, 21],
  [3, 22],
  [4, 22],
  [5, 22],
  [2, 23],
  [6, 23],
  [1, 25],
  [2, 25],
  [6, 25],
  [7, 25],
  [3, 35],
  [4, 35],
  [3, 36],
  [4, 36],
];

const topPattern = [
  // horizontal pattern, top mid-right
  [1, 5],
  [1, 6],
  [2, 5],
  [2, 6],
  [11, 5],
  [11, 6],
  [11, 7],
  [12, 4],
  [12, 8],
  [13, 3],
  [13, 9],
  [14, 3],
  [14, 9],
  [15, 6],
  [16, 4],
  [16, 8],
  [17, 5],
  [17, 6],
  [17, 7],
  [18, 6],
  [21, 3],
  [21, 4],
  [21, 5],
  [22, 3],
  [22, 4],
  [22, 5],
  [23, 2],
  [23, 6],
  [25, 1],
  [25, 2],
  [25, 6],
  [25, 7],
  [35, 3],
  [35, 4],
  [36, 3],
  [36, 4],
];

const colors = ["#e5cab7", "#6db5ff"];

let cellSize;
let columns;
let rows;
let liveCells;
let lastUpdate = 0;

function key(x, y) {
  return `${x}:${y}`;
}

function coordinates(cell) {
  return cell.split(":").map(Number);
}

function wrap(value, max) {
  return (value + max) % max;
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // Same sizing idea as the original code.
  cellSize = Math.min(window.innerWidth, window.innerHeight) / 70;
  columns = Math.ceil(window.innerWidth / cellSize);
  rows = Math.ceil(window.innerHeight / cellSize);

  resetPattern();
}

function resetPattern() {
  // Keep the tall pattern at the left, plus a wide copy near the upper right.
  const topPatternOffsetX = Math.max(10, Math.floor(columns * 0.57) - 17);
  const topPatternOffsetY = 1;

  liveCells = new Set([
    ...startingCells.map(([x, y]) => key(x, y)),
    ...topPattern.map(([x, y]) =>
      key(x + topPatternOffsetX, y + topPatternOffsetY),
    ),
  ]);
}

function getNeighbours(x, y) {
  const neighbours = [];

  for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
    for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
      if (xOffset === 0 && yOffset === 0) {
        continue;
      }

      neighbours.push(key(wrap(x + xOffset, columns), wrap(y + yOffset, rows)));
    }
  }

  return neighbours;
}

function countLiveNeighbours(x, y) {
  return getNeighbours(x, y).filter((cell) => liveCells.has(cell)).length;
}

function nextGeneration() {
  const cellsToCheck = new Set();

  liveCells.forEach((cell) => {
    const [x, y] = coordinates(cell);

    cellsToCheck.add(cell);

    getNeighbours(x, y).forEach((neighbour) => {
      cellsToCheck.add(neighbour);
    });
  });

  const nextCells = new Set();

  cellsToCheck.forEach((cell) => {
    const [x, y] = coordinates(cell);
    const neighbourCount = countLiveNeighbours(x, y);
    const isAlive = liveCells.has(cell);

    if (neighbourCount === 3 || (isAlive && neighbourCount === 2)) {
      nextCells.add(cell);
    }
  });

  liveCells = nextCells;
}

function draw() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  liveCells.forEach((cell) => {
    const [x, y] = coordinates(cell);

    // This small random alpha variation is the flicker.
    context.globalAlpha = 0.4 + Math.random() * 0.35;
    context.fillStyle = colors[(x + y) % colors.length];

    context.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
  });

  context.globalAlpha = 1;
}

function animate(timestamp) {
  if (timestamp - lastUpdate > 66) {
    nextGeneration();
    draw();
    lastUpdate = timestamp;
  }

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
draw();
requestAnimationFrame(animate);
