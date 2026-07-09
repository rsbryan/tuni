import { ScoredEntry } from "./ranking";
import { coverHues, coverInitials } from "./covers";
import { ItemKind, Tier } from "./types";

// Renders a 1080x1350 (4:5) top-ten card onto a canvas, entirely client-side.
const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 72;
const ROW_HEIGHT = 96;
const ART_SIZE = 72;
const IMAGE_TIMEOUT_MS = 5000;

const TIER_HEX: Record<Tier, string> = {
  liked: "#b6f542",
  fine: "#f5c542",
  disliked: "#f56e6e",
};

export interface CardFonts {
  sans: string;
  serif: string;
  mono: string;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // anonymous keeps the canvas untainted; failures fall back to gradients
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), IMAGE_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawFallbackArt(
  ctx: CanvasRenderingContext2D,
  entry: ScoredEntry["entry"],
  x: number,
  y: number,
  size: number
) {
  const { hueA, hueB } = coverHues(entry.id + entry.title);
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, `hsl(${hueA} 45% 22%)`);
  gradient.addColorStop(1, `hsl(${hueB} 60% 42%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "rgba(242, 239, 230, 0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(coverInitials(entry.title), x + size / 2, y + size / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export async function renderShareCard(
  canvas: HTMLCanvasElement,
  kind: ItemKind,
  rows: ScoredEntry[],
  fonts: CardFonts
): Promise<void> {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  await document.fonts.ready;
  const images = await Promise.all(
    rows.map((row) =>
      row.entry.imageUrl ? loadImage(row.entry.imageUrl) : Promise.resolve(null)
    )
  );

  // Background with the app's ambient glows
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glowTop = ctx.createRadialGradient(WIDTH / 2, -150, 0, WIDTH / 2, -150, 700);
  glowTop.addColorStop(0, "rgba(200, 245, 66, 0.10)");
  glowTop.addColorStop(1, "rgba(200, 245, 66, 0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glowBottom = ctx.createRadialGradient(WIDTH, HEIGHT, 0, WIDTH, HEIGHT, 800);
  glowBottom.addColorStop(0, "rgba(120, 90, 245, 0.08)");
  glowBottom.addColorStop(1, "rgba(120, 90, 245, 0)");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Header
  ctx.fillStyle = "#f2efe6";
  ctx.font = `36px ${fonts.serif}`;
  ctx.fillText("tunordi", MARGIN, 108);
  const wordmarkWidth = ctx.measureText("tunordi").width;
  ctx.fillStyle = "#c8f542";
  ctx.fillText(".", MARGIN + wordmarkWidth, 108);

  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  ctx.fillStyle = "#8c8b93";
  ctx.font = `24px ${fonts.mono}`;
  ctx.textAlign = "right";
  ctx.fillText(date, WIDTH - MARGIN, 104);
  ctx.textAlign = "left";

  ctx.fillStyle = "#f2efe6";
  ctx.font = `84px ${fonts.serif}`;
  ctx.fillText("My top ", MARGIN, 220);
  const prefixWidth = ctx.measureText("My top ").width;
  ctx.fillStyle = "#c8f542";
  ctx.font = `italic 84px ${fonts.serif}`;
  ctx.fillText(kind === "song" ? "songs." : "albums.", MARGIN + prefixWidth, 220);

  // Rows
  const listTop = 292;
  rows.forEach((row, i) => {
    const y = listTop + i * ROW_HEIGHT;
    const centerY = y + ROW_HEIGHT / 2;

    if (i > 0) {
      ctx.strokeStyle = "rgba(38, 38, 44, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN, y);
      ctx.lineTo(WIDTH - MARGIN, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#8c8b93";
    ctx.font = `28px ${fonts.mono}`;
    ctx.textAlign = "right";
    ctx.fillText(String(row.rank), MARGIN + 44, centerY + 10);
    ctx.textAlign = "left";

    const artX = MARGIN + 72;
    const artY = centerY - ART_SIZE / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, ART_SIZE, ART_SIZE, 12);
    ctx.clip();
    const img = images[i];
    if (img) {
      ctx.drawImage(img, artX, artY, ART_SIZE, ART_SIZE);
    } else {
      ctx.font = `26px ${fonts.serif}`;
      drawFallbackArt(ctx, row.entry, artX, artY, ART_SIZE);
    }
    ctx.restore();

    const textX = artX + ART_SIZE + 28;
    const textMax = WIDTH - MARGIN - 150 - textX;
    ctx.fillStyle = "#f2efe6";
    ctx.font = `600 32px ${fonts.sans}`;
    ctx.fillText(truncate(ctx, row.entry.title, textMax), textX, centerY - 4);
    ctx.fillStyle = "#8c8b93";
    ctx.font = `26px ${fonts.sans}`;
    ctx.fillText(truncate(ctx, row.entry.artist, textMax), textX, centerY + 32);

    // Score chip
    const color = TIER_HEX[row.entry.tier];
    const chipW = 110;
    const chipH = 52;
    const chipX = WIDTH - MARGIN - chipW;
    const chipY = centerY - chipH / 2;
    ctx.fillStyle = `${color}1a`;
    ctx.strokeStyle = `${color}4d`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `600 28px ${fonts.mono}`;
    ctx.textAlign = "center";
    ctx.fillText(row.score.toFixed(1), chipX + chipW / 2, centerY + 10);
    ctx.textAlign = "left";
  });

  // Footer
  ctx.fillStyle = "#8c8b93";
  ctx.font = `24px ${fonts.mono}`;
  ctx.textAlign = "center";
  ctx.fillText("ranked head-to-head on tunordi", WIDTH / 2, HEIGHT - 56);
  ctx.textAlign = "left";
}
