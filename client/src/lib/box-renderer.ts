export type BoxStyleId = "classic" | "minimal" | "tape" | "crate" | "ivory" | "kraft";

export type BoxPalette = {
  outer: string;
  inner: string;
  accent: string;
  label: string;
  tape: string;
};

export type BoxMetrics = {
  width: number;
  backHeight: number;
  frontHeight: number;
  flapHeight: number;
  sideDepth: number;
  frontOffset: number;
};

export type BoxPreset = {
  id: BoxStyleId;
  name: string;
  description: string;
  palette: BoxPalette;
  label: string;
  stamp: string;
  metrics?: Partial<BoxMetrics>;
};

export const DEFAULT_BOX_METRICS: BoxMetrics = {
  width: 420,
  backHeight: 260,
  frontHeight: 180,
  flapHeight: 80,
  sideDepth: 90,
  frontOffset: 50,
};

export const BOX_PRESETS: Record<BoxStyleId, BoxPreset> = {
  classic: {
    id: "classic",
    name: "클래식",
    description: "스트라이프 + 배지",
    palette: {
      outer: "#E3CBAD",
      inner: "#C8AD94",
      accent: "#8D6E53",
      label: "#8D6E53",
      tape: "#D4BB9E",
    },
    label: "프리미엄 패키지",
    stamp: "핸드패킹",
  },
  minimal: {
    id: "minimal",
    name: "미니멀",
    description: "클린 + 얇은 라인",
    palette: {
      outer: "#F2ECE3",
      inner: "#E7DDD1",
      accent: "#6B5B4A",
      label: "#4A3F34",
      tape: "#DED4C8",
    },
    label: "미니멀 팩",
    stamp: "",
    metrics: {
      sideDepth: 60,
      flapHeight: 60,
      frontHeight: 170,
    },
  },
  tape: {
    id: "tape",
    name: "테이프",
    description: "배송 테이프",
    palette: {
      outer: "#E6D2B6",
      inner: "#D9BEA1",
      accent: "#6D5842",
      label: "#5A4838",
      tape: "#C8A86D",
    },
    label: "쉬핑 박스",
    stamp: "취급주의",
    metrics: {
      sideDepth: 100,
    },
  },
  crate: {
    id: "crate",
    name: "크레이트",
    description: "우드 슬랫",
    palette: {
      outer: "#C9A776",
      inner: "#B58C5B",
      accent: "#5A4029",
      label: "#4A3422",
      tape: "#9D7A52",
    },
    label: "우드 크레이트",
    stamp: "습기주의",
    metrics: {
      sideDepth: 110,
      frontHeight: 190,
    },
  },
  ivory: {
    id: "ivory",
    name: "아이보리",
    description: "화이트 톤",
    palette: {
      outer: "#F6F1EA",
      inner: "#EEE4D6",
      accent: "#8B7A68",
      label: "#5E5146",
      tape: "#E2D3C2",
    },
    label: "아이보리 박스",
    stamp: "클린",
    metrics: {
      sideDepth: 70,
      frontHeight: 170,
    },
  },
  kraft: {
    id: "kraft",
    name: "크라프트",
    description: "내추럴 크라프트",
    palette: {
      outer: "#D6B58A",
      inner: "#C9A97C",
      accent: "#7C5A37",
      label: "#5A432A",
      tape: "#B89260",
    },
    label: "크라프트 박스",
    stamp: "재활용",
    metrics: {
      sideDepth: 95,
      frontHeight: 185,
    },
  },
};

export const getBoxMetrics = (preset: BoxPreset, scale: number, perspective: number): BoxMetrics => {
  const base = { ...DEFAULT_BOX_METRICS, ...preset.metrics };
  const clampedScale = Math.max(0.6, Math.min(scale, 1.6));
  const clampedPerspective = Math.max(0.6, Math.min(perspective, 1.6));

  return {
    width: base.width * clampedScale,
    backHeight: base.backHeight * clampedScale,
    frontHeight: base.frontHeight * clampedScale,
    flapHeight: base.flapHeight * clampedScale,
    sideDepth: base.sideDepth * clampedScale * clampedPerspective,
    frontOffset: base.frontOffset * clampedScale * clampedPerspective,
  };
};

export type BoxRenderOptions = {
  presetId: BoxStyleId;
  palette: BoxPalette;
  label: string;
  stamp: string;
  showStamp: boolean;
  scale: number;
  perspective: number;
};

export const drawBoxBack = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  options: BoxRenderOptions,
) => {
  const preset = BOX_PRESETS[options.presetId];
  const metrics = getBoxMetrics(preset, options.scale, options.perspective);
  const w = metrics.width;
  const h = metrics.backHeight;
  const flap = metrics.flapHeight;

  ctx.save();
  ctx.fillStyle = options.palette.inner;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy + h / 2 - 40);
  ctx.lineTo(cx - w / 2, cy + h / 2 - 40);
  ctx.closePath();
  ctx.fill();

  const gradient = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

  ctx.fillStyle = options.palette.outer;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2 - 30, cy - h / 2 - flap);
  ctx.lineTo(cx - w / 2 + 30, cy - h / 2 - flap);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = options.palette.accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
};

export const drawBoxFront = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  options: BoxRenderOptions,
) => {
  const preset = BOX_PRESETS[options.presetId];
  const metrics = getBoxMetrics(preset, options.scale, options.perspective);
  const w = metrics.width;
  const h = metrics.frontHeight;
  const topY = cy + metrics.frontOffset;
  const bottomY = topY + h;
  const sideDepth = metrics.sideDepth;

  ctx.save();
  ctx.fillStyle = options.palette.outer;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, topY);
  ctx.lineTo(cx + w / 2, topY);
  ctx.lineTo(cx + w / 2, bottomY);
  ctx.lineTo(cx - w / 2, bottomY);
  ctx.closePath();
  ctx.fill();

  const frontGradient = ctx.createLinearGradient(cx, topY, cx, bottomY);
  frontGradient.addColorStop(0, "rgba(255,255,255,0.06)");
  frontGradient.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = frontGradient;
  ctx.fillRect(cx - w / 2, topY, w, h);

  ctx.fillStyle = options.palette.outer;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, topY);
  ctx.lineTo(cx - w / 2, bottomY);
  ctx.lineTo(cx - w / 2 - sideDepth, bottomY - 40);
  ctx.lineTo(cx - w / 2 - sideDepth, topY - 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fill();

  ctx.fillStyle = options.palette.outer;
  ctx.beginPath();
  ctx.moveTo(cx + w / 2, topY);
  ctx.lineTo(cx + w / 2, bottomY);
  ctx.lineTo(cx + w / 2 + sideDepth, bottomY - 40);
  ctx.lineTo(cx + w / 2 + sideDepth, topY - 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fill();

  if (preset.id === "classic") {
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 2;
    for (let i = cx - w / 2 + 4; i < cx + w / 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, topY);
      ctx.lineTo(i, bottomY);
      ctx.stroke();
    }

    ctx.strokeStyle = options.palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 30, topY + 60);
    ctx.lineTo(cx, topY + 30);
    ctx.lineTo(cx + 30, topY + 60);
    ctx.stroke();
    ctx.strokeRect(cx - 20, topY + 60, 40, 40);
  }

  if (preset.id === "minimal") {
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - w / 2 + 6, topY + 6, w - 12, h - 12);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + 16, topY + h * 0.6);
    ctx.lineTo(cx + w / 2 - 16, topY + h * 0.6);
    ctx.stroke();
  }

  if (preset.id === "tape") {
    const tapeY = topY + h * 0.45;
    const tapeH = Math.max(18, h * 0.18);
    ctx.fillStyle = options.palette.tape;
    ctx.fillRect(cx - w / 2, tapeY, w, tapeH);
    ctx.fillRect(cx - 16, topY, 32, h);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx - w / 2 + 4, tapeY + 4, w - 8, tapeH - 8);
    ctx.setLineDash([]);
  }

  if (preset.id === "crate") {
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    for (let y = topY + 12; y < bottomY; y += 18) {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + 10, y);
      ctx.lineTo(cx + w / 2 - 10, y);
      ctx.stroke();
    }

    ctx.lineWidth = 3;
    for (let x = cx - w / 2 + 20; x < cx + w / 2; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, topY + 10);
      ctx.lineTo(x, bottomY - 10);
      ctx.stroke();
    }

    ctx.fillStyle = options.palette.accent;
    ctx.fillRect(cx - w / 2 + 10, topY + 10, 10, 40);
    ctx.fillRect(cx + w / 2 - 20, topY + 10, 10, 40);
    ctx.fillRect(cx - w / 2 + 10, bottomY - 50, 10, 40);
    ctx.fillRect(cx + w / 2 - 20, bottomY - 50, 10, 40);
  }

  const labelText = options.label.trim();
  if (labelText) {
    ctx.font = preset.id === "minimal" ? "600 16px sans-serif" : "700 18px sans-serif";
    ctx.fillStyle = options.palette.label;
    ctx.textAlign = "center";
    ctx.fillText(labelText, cx, topY + h * 0.72);
  }

  if (options.showStamp && options.stamp.trim()) {
    const stampW = 70;
    const stampH = 28;
    const stampX = cx - w / 2 + 22;
    const stampY = topY + 18;
    ctx.strokeStyle = options.palette.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(stampX, stampY, stampW, stampH);
    ctx.fillStyle = options.palette.accent;
    ctx.font = "700 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(options.stamp.trim(), stampX + stampW / 2, stampY + 18);
  }

  ctx.restore();
};
