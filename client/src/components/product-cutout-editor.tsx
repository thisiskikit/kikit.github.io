import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CoupangProduct } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eraser, Paintbrush2, RotateCcw, Save } from "lucide-react";

export interface ProductCutoutCacheEntry {
  productId: string;
  sellerProductCode: string;
  productName: string;
  sourceImageUrl: string;
  maskDataUrl: string;
  outputDataUrl: string;
  width: number;
  height: number;
  updatedAt: string;
}

interface ProductCutoutEditorProps {
  open: boolean;
  product: CoupangProduct | null;
  initialCache?: ProductCutoutCacheEntry | null;
  onSave: (entry: ProductCutoutCacheEntry) => void;
  onOpenChange: (open: boolean) => void;
}

const MAX_EDITOR_DIMENSION = 760;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });

const computeEdgeMap = (imageData: ImageData): Float32Array => {
  const { data, width, height } = imageData;
  const total = width * height;
  const luminance = new Float32Array(total);
  const edge = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    luminance[i] = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const left = luminance[y * width + Math.max(0, x - 1)];
      const right = luminance[y * width + Math.min(width - 1, x + 1)];
      const up = luminance[Math.max(0, y - 1) * width + x];
      const down = luminance[Math.min(height - 1, y + 1) * width + x];
      const value = Math.min(1, Math.abs(right - left) + Math.abs(down - up));
      edge[idx] = value;
    }
  }

  return edge;
};

const countMaskPixels = (mask: Uint8ClampedArray) => {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) count += 1;
  }
  return count;
};

const buildMaskDataUrl = (mask: Uint8ClampedArray, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4;
    imageData.data[offset] = 255;
    imageData.data[offset + 1] = 255;
    imageData.data[offset + 2] = 255;
    imageData.data[offset + 3] = mask[i];
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

const buildCutoutDataUrl = (baseImageData: ImageData, mask: Uint8ClampedArray) => {
  const canvas = document.createElement("canvas");
  canvas.width = baseImageData.width;
  canvas.height = baseImageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const output = new ImageData(new Uint8ClampedArray(baseImageData.data), baseImageData.width, baseImageData.height);
  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4 + 3;
    output.data[offset] = Math.round(output.data[offset] * (mask[i] / 255));
  }
  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL("image/png");
};

const readMaskFromDataUrl = async (maskDataUrl: string, width: number, height: number) => {
  const img = await loadImage(maskDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8ClampedArray(width * height);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8ClampedArray(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = imageData.data[i * 4 + 3] > 24 ? 255 : 0;
  }
  return mask;
};

export function ProductCutoutEditor({
  open,
  product,
  initialCache,
  onSave,
  onOpenChange,
}: ProductCutoutEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const edgeMapRef = useRef<Float32Array | null>(null);
  const maskRef = useRef<Uint8ClampedArray | null>(null);
  const maskPixelCountRef = useRef(0);
  const visitMarksRef = useRef<Uint32Array | null>(null);
  const visitTokenRef = useRef(1);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRef = useRef<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const loadTokenRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(24);
  const [snapStrength, setSnapStrength] = useState(72);
  const [mode, setMode] = useState<"add" | "erase">("add");
  const [maskPixelCount, setMaskPixelCount] = useState(0);

  const currentSourceUrl = useMemo(() => product?.images_main?.trim() || "", [product]);
  const hasValidCache = useMemo(
    () => Boolean(initialCache && initialCache.sourceImageUrl === currentSourceUrl && initialCache.maskDataUrl),
    [initialCache, currentSourceUrl],
  );

  const ensureVisitBuffer = (size: number) => {
    if (!visitMarksRef.current || visitMarksRef.current.length !== size) {
      visitMarksRef.current = new Uint32Array(size);
      visitTokenRef.current = 1;
    }
    visitTokenRef.current += 1;
    if (visitTokenRef.current > 4_000_000_000) {
      visitMarksRef.current.fill(0);
      visitTokenRef.current = 1;
    }
    return { marks: visitMarksRef.current, token: visitTokenRef.current };
  };

  const rebuildOverlayCanvas = useCallback(() => {
    const imageData = imageDataRef.current;
    const mask = maskRef.current;
    if (!imageData || !mask) return;

    let overlay = overlayCanvasRef.current;
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlayCanvasRef.current = overlay;
    }
    overlay.width = imageData.width;
    overlay.height = imageData.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const overlayData = ctx.createImageData(imageData.width, imageData.height);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 0) continue;
      const offset = i * 4;
      overlayData.data[offset] = 16;
      overlayData.data[offset + 1] = 185;
      overlayData.data[offset + 2] = 129;
      overlayData.data[offset + 3] = 124;
    }
    ctx.putImageData(overlayData, 0, 0);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = baseCanvas;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(baseCanvas, 0, 0);

    if (overlayCanvasRef.current) {
      ctx.drawImage(overlayCanvasRef.current, 0, 0);
    }

    if (cursorRef.current.visible) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cursorRef.current.x, cursorRef.current.y, brushSize, 0, Math.PI * 2);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = mode === "add" ? "rgba(16,185,129,0.95)" : "rgba(244,63,94,0.95)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }, [brushSize, mode]);

  const applySmartBrush = useCallback(
    (pointX: number, pointY: number) => {
      const imageData = imageDataRef.current;
      const mask = maskRef.current;
      const edge = edgeMapRef.current;
      if (!imageData || !mask || !edge) return false;

      const { width, height, data } = imageData;
      const centerX = clamp(Math.round(pointX), 0, width - 1);
      const centerY = clamp(Math.round(pointY), 0, height - 1);
      const seedIndex = centerY * width + centerX;
      const seedOffset = seedIndex * 4;
      const seedR = data[seedOffset];
      const seedG = data[seedOffset + 1];
      const seedB = data[seedOffset + 2];
      const seedL = (0.299 * seedR + 0.587 * seedG + 0.114 * seedB) / 255;

      const snap = clamp(snapStrength / 100, 0, 1);
      const maxDistance = Math.max(8, Math.round(brushSize * (1.3 + snap * 1.25)));
      const maxDistanceSq = maxDistance * maxDistance;
      const coreDistance = Math.max(4, Math.round(brushSize * 0.72));
      const coreDistanceSq = coreDistance * coreDistance;
      const colorTolerance = 18 + (1 - snap) * 82;
      const lumaTolerance = 0.06 + (1 - snap) * 0.42;
      const edgeTolerance = 0.05 + (1 - snap) * 0.45;

      const { marks, token } = ensureVisitBuffer(mask.length);
      const queue: number[] = [];
      let head = 0;
      queue.push(seedIndex);
      marks[seedIndex] = token;
      let changed = 0;

      while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % width;
        const y = (idx / width) | 0;
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxDistanceSq) continue;

        const offset = idx * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const colorDiff = Math.sqrt(
          (r - seedR) * (r - seedR) +
          (g - seedG) * (g - seedG) +
          (b - seedB) * (b - seedB),
        );
        const edgeValue = edge[idx];
        const distanceRatio = Math.sqrt(distSq) / maxDistance;

        const corePass = distSq <= coreDistanceSq;
        const magicPass =
          colorDiff <= colorTolerance * (1 + distanceRatio * 0.32) &&
          Math.abs(l - seedL) <= lumaTolerance * (1 + distanceRatio * 0.36) &&
          edgeValue <= edgeTolerance * (1 + (1 - snap) * 0.5);
        if (!corePass && !magicPass) continue;

        if (mode === "add") {
          if (mask[idx] === 0) {
            mask[idx] = 255;
            maskPixelCountRef.current += 1;
            changed += 1;
          }
        } else if (mask[idx] !== 0) {
          mask[idx] = 0;
          maskPixelCountRef.current -= 1;
          changed += 1;
        }

        if (x > 0) {
          const n = idx - 1;
          if (marks[n] !== token) {
            marks[n] = token;
            queue.push(n);
          }
        }
        if (x < width - 1) {
          const n = idx + 1;
          if (marks[n] !== token) {
            marks[n] = token;
            queue.push(n);
          }
        }
        if (y > 0) {
          const n = idx - width;
          if (marks[n] !== token) {
            marks[n] = token;
            queue.push(n);
          }
        }
        if (y < height - 1) {
          const n = idx + width;
          if (marks[n] !== token) {
            marks[n] = token;
            queue.push(n);
          }
        }
      }

      if (changed > 0) {
        rebuildOverlayCanvas();
        setMaskPixelCount(maskPixelCountRef.current);
        setIsDirty(true);
      }
      return changed > 0;
    },
    [brushSize, mode, rebuildOverlayCanvas, snapStrength],
  );

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const applyBrushAlongPath = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const step = Math.max(1, brushSize * 0.35);
      const steps = Math.max(1, Math.ceil(distance / step));
      let changed = false;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        if (applySmartBrush(x, y)) changed = true;
      }
      return changed;
    },
    [applySmartBrush, brushSize],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isLoading) return;
    const point = getCanvasPoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cursorRef.current = { ...point, visible: true };
    lastPointRef.current = point;
    setIsDrawing(true);
    applySmartBrush(point.x, point.y);
    redraw();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    if (!point) return;
    cursorRef.current = { ...point, visible: true };

    if (isDrawing && lastPointRef.current) {
      applyBrushAlongPath(lastPointRef.current, point);
      lastPointRef.current = point;
    }
    redraw();
  };

  const finishDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer release race conditions.
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;
    redraw();
  };

  const hideCursor = () => {
    cursorRef.current.visible = false;
    redraw();
  };

  const buildCacheEntry = useCallback((): ProductCutoutCacheEntry | null => {
    if (!product || !currentSourceUrl) return null;
    const baseImageData = imageDataRef.current;
    const mask = maskRef.current;
    if (!baseImageData || !mask || maskPixelCountRef.current <= 0) return null;

    const outputDataUrl = buildCutoutDataUrl(baseImageData, mask);
    const maskDataUrl = buildMaskDataUrl(mask, baseImageData.width, baseImageData.height);
    if (!outputDataUrl || !maskDataUrl) return null;

    return {
      productId: product.product_id,
      sellerProductCode: product.seller_product_code,
      productName: product.product_name,
      sourceImageUrl: currentSourceUrl,
      outputDataUrl,
      maskDataUrl,
      width: baseImageData.width,
      height: baseImageData.height,
      updatedAt: new Date().toISOString(),
    };
  }, [currentSourceUrl, product]);

  const persistCache = useCallback(async () => {
    const entry = buildCacheEntry();
    if (!entry) return false;
    onSave(entry);
    setIsDirty(false);
    return true;
  }, [buildCacheEntry, onSave]);

  const handleSave = async () => {
    if (maskPixelCount <= 0) return;
    setIsSaving(true);
    try {
      await persistCache();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenState = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    void (async () => {
      if (isDirty && maskPixelCount > 0) {
        setIsSaving(true);
        try {
          await persistCache();
        } finally {
          setIsSaving(false);
        }
      }
      onOpenChange(false);
    })();
  };

  const clearMask = () => {
    const mask = maskRef.current;
    if (!mask) return;
    mask.fill(0);
    maskPixelCountRef.current = 0;
    setMaskPixelCount(0);
    setIsDirty(true);
    rebuildOverlayCanvas();
    redraw();
  };

  useEffect(() => {
    if (!open || !product) return;
    if (!currentSourceUrl) {
      setLoadError("상품 메인 이미지 URL이 없어 영역 편집을 시작할 수 없습니다.");
      return;
    }

    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setIsDirty(false);
      setMaskPixelCount(0);
      maskPixelCountRef.current = 0;
      cursorRef.current.visible = false;
      lastPointRef.current = null;
      setMode("add");

      try {
        const trySources = [
          `/api/images/proxy?url=${encodeURIComponent(currentSourceUrl)}`,
          currentSourceUrl,
        ];

        let loadedImage: HTMLImageElement | null = null;
        for (const src of trySources) {
          try {
            loadedImage = await loadImage(src);
            break;
          } catch {
            // Try next source.
          }
        }
        if (!loadedImage) throw new Error("이미지를 불러올 수 없습니다.");

        const scale = Math.min(1, MAX_EDITOR_DIMENSION / Math.max(loadedImage.naturalWidth, loadedImage.naturalHeight));
        const width = Math.max(1, Math.round(loadedImage.naturalWidth * scale));
        const height = Math.max(1, Math.round(loadedImage.naturalHeight * scale));

        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = width;
        baseCanvas.height = height;
        const baseCtx = baseCanvas.getContext("2d");
        if (!baseCtx) throw new Error("캔버스를 초기화하지 못했습니다.");
        baseCtx.clearRect(0, 0, width, height);
        baseCtx.drawImage(loadedImage, 0, 0, width, height);
        const baseImageData = baseCtx.getImageData(0, 0, width, height);

        if (loadTokenRef.current !== token) return;

        baseCanvasRef.current = baseCanvas;
        imageDataRef.current = baseImageData;
        edgeMapRef.current = computeEdgeMap(baseImageData);
        maskRef.current = new Uint8ClampedArray(width * height);
        overlayCanvasRef.current = null;
        visitMarksRef.current = null;

        if (hasValidCache && initialCache?.maskDataUrl) {
          try {
            const restoredMask = await readMaskFromDataUrl(initialCache.maskDataUrl, width, height);
            if (loadTokenRef.current !== token) return;
            maskRef.current = restoredMask;
            maskPixelCountRef.current = countMaskPixels(restoredMask);
            setMaskPixelCount(maskPixelCountRef.current);
          } catch {
            // Ignore invalid cache payload and continue with empty mask.
          }
        }

        rebuildOverlayCanvas();
        redraw();
      } catch (err: any) {
        if (loadTokenRef.current !== token) return;
        setLoadError(err?.message || "이미지를 로드하지 못했습니다.");
      } finally {
        if (loadTokenRef.current === token) {
          setIsLoading(false);
        }
      }
    };

    void load();
  }, [currentSourceUrl, hasValidCache, initialCache?.maskDataUrl, open, product, rebuildOverlayCanvas, redraw]);

  useEffect(() => {
    redraw();
  }, [mode, brushSize, redraw]);

  return (
    <Dialog open={open} onOpenChange={handleOpenState}>
      <DialogContent className="w-[96vw] max-w-5xl p-4 sm:p-5">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-base">상품 영역 누끼 편집</DialogTitle>
          <DialogDescription className="text-xs">
            상품별로 영역을 그려 저장하면, 이후 누끼 실행 시 저장된 영역 캐시를 재사용합니다.
          </DialogDescription>
        </DialogHeader>

        {!product ? (
          <div className="rounded-md border p-6 text-sm text-muted-foreground text-center">편집할 상품을 선택하세요.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-mono truncate">{product.seller_product_code}</p>
                  <p className="text-sm font-medium truncate">{product.product_name}</p>
                </div>
                {hasValidCache ? <Badge variant="secondary" className="text-[10px]">저장된 캐시 있음</Badge> : null}
              </div>

              <div className="relative overflow-auto rounded-md border bg-black/5">
                <canvas
                  ref={canvasRef}
                  className="max-h-[70vh] w-full touch-none cursor-crosshair"
                  style={{ imageRendering: "auto" }}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrawing}
                  onPointerCancel={finishDrawing}
                  onPointerLeave={hideCursor}
                  data-testid="canvas-product-cutout-editor"
                />
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : null}
              </div>
              {loadError ? <p className="mt-2 text-xs text-red-500">{loadError}</p> : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-xs">브러시 모드</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "add" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setMode("add")}
                    data-testid="button-cutout-mode-add"
                  >
                    <Paintbrush2 className="w-3.5 h-3.5" />
                    영역 추가
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "erase" ? "default" : "outline"}
                    className="flex-1 gap-1.5"
                    onClick={() => setMode("erase")}
                    data-testid="button-cutout-mode-erase"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    영역 지우기
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="text-xs">브러시 크기</Label>
                    <span className="font-mono">{brushSize}px</span>
                  </div>
                  <Slider
                    value={[brushSize]}
                    onValueChange={([value]) => setBrushSize(clamp(Math.round(value), 6, 90))}
                    min={6}
                    max={90}
                    step={1}
                    data-testid="slider-cutout-brush-size"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="text-xs">경계 흡착 강도(매직)</Label>
                    <span className="font-mono">{snapStrength}%</span>
                  </div>
                  <Slider
                    value={[snapStrength]}
                    onValueChange={([value]) => setSnapStrength(clamp(Math.round(value), 0, 100))}
                    min={0}
                    max={100}
                    step={1}
                    data-testid="slider-cutout-snap-strength"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">선택 픽셀</span>
                  <span className="font-mono">{maskPixelCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">상태</span>
                  <span>{isDirty ? "저장 필요" : "저장됨"}</span>
                </div>
                <p className="text-muted-foreground">대략 원형으로 그리면 경계/색을 따라 영역이 자동 확장됩니다.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={clearMask}
                  disabled={isLoading || maskPixelCount === 0}
                  data-testid="button-cutout-clear-mask"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  마스크 초기화
                </Button>
                <Button
                  type="button"
                  className="flex-1 gap-1.5"
                  onClick={() => void handleSave()}
                  disabled={isLoading || isSaving || maskPixelCount === 0}
                  data-testid="button-cutout-save-cache"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  캐시 저장
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between sm:items-center">
          <p className="text-[11px] text-muted-foreground">닫을 때 저장되지 않은 마스크가 있으면 자동 저장됩니다.</p>
          <Button type="button" variant="outline" onClick={() => handleOpenState(false)} disabled={isSaving}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
