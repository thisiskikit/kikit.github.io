import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  Download,
  RefreshCcw,
  Box,
  Trash2,
  Wand2,
  Maximize,
  Link as LinkIcon,
  ImageIcon,
  Layers,
} from "lucide-react";

interface ProductItem {
  id: number;
  src: string;
  ratio: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  brightness: number;
}

const BOX_CONFIG = {
  colorInner: "#C8AD94",
  colorOuter: "#E3CBad",
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 700;

function processImageBackground(imgSrc: string, removeBg: boolean): Promise<{ src: string; width: number; height: number; ratio: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgSrc;

    img.onload = () => {
      if (!removeBg) {
        resolve({ src: imgSrc, width: img.width, height: img.height, ratio: img.width / img.height });
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      const visited = new Uint8Array(width * height);
      const queue: [number, number][] = [];

      const isWhite = (index: number) => data[index] > 230 && data[index + 1] > 230 && data[index + 2] > 230;

      for (let x = 0; x < width; x++) {
        if (isWhite((0 * width + x) * 4)) queue.push([x, 0]);
        if (isWhite(((height - 1) * width + x) * 4)) queue.push([x, height - 1]);
      }
      for (let y = 0; y < height; y++) {
        if (isWhite((y * width + 0) * 4)) queue.push([0, y]);
        if (isWhite((y * width + (width - 1)) * 4)) queue.push([width - 1, y]);
      }

      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const idx = cy * width + cx;
        if (visited[idx]) continue;
        visited[idx] = 1;
        const dataIdx = idx * 4;
        data[dataIdx + 3] = 0;

        for (let i = 0; i < 4; i++) {
          const nx = cx + dx[i];
          const ny = cy + dy[i];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            const nDataIdx = nIdx * 4;
            if (!visited[nIdx] && isWhite(nDataIdx)) {
              queue.push([nx, ny]);
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve({ src: canvas.toDataURL(), width: img.width, height: img.height, ratio: img.width / img.height });
    };

    img.onerror = () => {
      resolve({ src: imgSrc, width: 100, height: 100, ratio: 1 });
    };
  });
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function smartPack(currentProducts: ProductItem[], ratio: number = 1.0): ProductItem[] {
  if (!currentProducts || currentProducts.length === 0) return [];

  const count = currentProducts.length;
  const boxWidth = 360;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const spreadRatio = 1 + (ratio - 1) * 0.6;

  const createSlots = (rowCount: number, yBase: number, scaleBase: number, zIndexBase: number, brightness: number, seedOffset: number) => {
    const slots: { x: number; y: number; scale: number; rotation: number; zIndex: number; brightness: number }[] = [];
    const currentBoxWidth = boxWidth * spreadRatio;

    for (let i = 0; i < rowCount; i++) {
      const xOffset = (i - (rowCount - 1) / 2) * (currentBoxWidth / (rowCount + (rowCount > 1 ? 0.5 : 0)));
      const archY = Math.abs(xOffset) * 0.1;
      const rndScale = pseudoRandom(i + seedOffset) * 0.1 - 0.05;
      const rndRot = pseudoRandom(i + seedOffset + 100) * 20 - 10;

      slots.push({
        x: centerX + xOffset,
        y: yBase + archY,
        scale: (scaleBase + rndScale) * ratio,
        rotation: rndRot + xOffset * 0.05,
        zIndex: zIndexBase + i,
        brightness,
      });
    }
    return slots;
  };

  let slots: { x: number; y: number; scale: number; rotation: number; zIndex: number; brightness: number }[] = [];

  if (count <= 3) {
    slots = createSlots(count, centerY - 20, 1.2, 50, 100, 0);
  } else if (count <= 6) {
    const backCount = Math.ceil(count / 2);
    const frontCount = count - backCount;
    slots = [
      ...createSlots(backCount, centerY - 60, 0.9, 10, 90, 10),
      ...createSlots(frontCount, centerY + 20, 1.1, 50, 100, 20),
    ];
  } else {
    const backCount = Math.ceil(count * 0.4);
    const midCount = Math.ceil(count * 0.35);
    const frontCount = count - backCount - midCount;
    slots = [
      ...createSlots(backCount, centerY - 80, 0.85, 10, 85, 30),
      ...createSlots(midCount, centerY - 10, 1.0, 40, 95, 40),
      ...createSlots(frontCount, centerY + 50, 1.15, 70, 105, 50),
    ];
  }

  return currentProducts.map((p, i) => {
    const slot = slots[i % slots.length];
    return { ...p, x: slot.x, y: slot.y, scale: slot.scale, rotation: slot.rotation, zIndex: slot.zIndex, brightness: slot.brightness };
  });
}

export default function SmartBoxPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [removeBg, setRemoveBg] = useState(true);
  const [fillRatio, setFillRatio] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const interactionMode = useRef<"none" | "move" | "resize">("none");
  const initialDragData = useRef({ startX: 0, startY: 0, initialScale: 1, initialDist: 0 });

  const preloadImage = useCallback((src: string): HTMLImageElement => {
    if (imageCache.current.has(src)) return imageCache.current.get(src)!;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    imageCache.current.set(src, img);
    return img;
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const processedItems = await Promise.all(
      files.map(async (file) => {
        const rawUrl = URL.createObjectURL(file);
        const processed = await processImageBackground(rawUrl, removeBg);
        return {
          id: Date.now() + Math.random(),
          src: processed.src,
          ratio: processed.ratio,
          x: 0, y: 0,
          width: 120,
          height: 120 / processed.ratio,
          rotation: 0, scale: 1, zIndex: 0, brightness: 100,
        };
      })
    );

    setProducts((prev) => smartPack([...prev, ...processedItems], fillRatio));
    e.target.value = "";
  };

  const handleUrlAdd = async () => {
    if (!imageUrlInput.trim()) return;
    const processed = await processImageBackground(imageUrlInput, removeBg);
    const newProduct: ProductItem = {
      id: Date.now() + Math.random(),
      src: processed.src,
      ratio: processed.ratio,
      x: 0, y: 0,
      width: 120,
      height: 120 / processed.ratio,
      rotation: 0, scale: 1, zIndex: 0, brightness: 100,
    };
    setProducts((prev) => smartPack([...prev, newProduct], fillRatio));
    setImageUrlInput("");
  };

  useEffect(() => {
    if (products.length > 0) {
      setProducts((prev) => smartPack(prev, fillRatio));
    }
  }, [fillRatio]);

  const handleAutoPack = () => {
    setProducts(smartPack(products, fillRatio));
  };

  const deleteSelected = () => {
    if (selectedId != null) {
      setProducts((prev) => prev.filter((p) => p.id !== selectedId));
      setSelectedId(null);
    }
  };

  const drawBoxBack = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    const w = 420;
    const h = 260;
    ctx.save();
    ctx.fillStyle = BOX_CONFIG.colorInner;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy + h / 2 - 40);
    ctx.lineTo(cx - w / 2, cy + h / 2 - 40);
    ctx.fill();

    const gradient = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.2)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = "#bca086";
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2 - 30, cy - h / 2 - 80);
    ctx.lineTo(cx - w / 2 + 30, cy - h / 2 - 80);
    ctx.fill();
    ctx.restore();
  }, []);

  const drawBoxFront = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    const w = 420;
    const h = 180;
    const topY = cy + 50;
    const bottomY = topY + h;

    ctx.save();
    ctx.fillStyle = BOX_CONFIG.colorOuter;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY);
    ctx.lineTo(cx + w / 2, topY);
    ctx.lineTo(cx + w / 2, bottomY);
    ctx.lineTo(cx - w / 2, bottomY);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 2;
    for (let i = cx - w / 2; i < cx + w / 2; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, topY);
      ctx.lineTo(i, bottomY);
      ctx.stroke();
    }

    ctx.strokeStyle = "#8d6e53";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 30, topY + 60);
    ctx.lineTo(cx, topY + 30);
    ctx.lineTo(cx + 30, topY + 60);
    ctx.stroke();
    ctx.strokeRect(cx - 20, topY + 60, 40, 40);

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#8d6e53";
    ctx.textAlign = "center";
    ctx.fillText("PREMIUM SNACK", cx, topY + 130);

    ctx.fillStyle = "#d4bb9e";
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY);
    ctx.lineTo(cx - w / 2, bottomY);
    ctx.lineTo(cx - w / 2 - 90, bottomY - 40);
    ctx.lineTo(cx - w / 2 - 90, topY - 40);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + w / 2, topY);
    ctx.lineTo(cx + w / 2, bottomY);
    ctx.lineTo(cx + w / 2 + 90, bottomY - 40);
    ctx.lineTo(cx + w / 2 + 90, topY - 40);
    ctx.fill();

    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 50;

    drawBoxBack(ctx, cx, cy);

    const sortedProducts = [...products].sort((a, b) => a.zIndex - b.zIndex);

    sortedProducts.forEach((product) => {
      const img = preloadImage(product.src);

      ctx.save();
      ctx.translate(product.x, product.y);
      ctx.rotate((product.rotation * Math.PI) / 180);
      ctx.scale(product.scale, product.scale);

      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;

      if (img.complete) {
        try {
          ctx.drawImage(img, -product.width / 2, -product.height / 2, product.width, product.height);

          if (product.id === selectedId) {
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 2 / product.scale;
            ctx.strokeRect(-product.width / 2, -product.height / 2, product.width, product.height);

            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 2 / product.scale;
            const handleRadius = 6 / product.scale;
            const halfW = product.width / 2;
            const halfH = product.height / 2;
            const corners = [
              { x: -halfW, y: -halfH },
              { x: halfW, y: -halfH },
              { x: halfW, y: halfH },
              { x: -halfW, y: halfH },
            ];
            corners.forEach((c) => {
              ctx.beginPath();
              ctx.arc(c.x, c.y, handleRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            });
          }
        } catch (_e) {}
      }
      ctx.restore();
    });

    drawBoxFront(ctx, cx, cy);
  }, [products, selectedId, drawBoxBack, drawBoxFront, preloadImage]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const getProductCorners = (p: ProductItem) => {
    const rad = (p.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const halfW = (p.width * p.scale) / 2;
    const halfH = (p.height * p.scale) / 2;
    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];
    return corners.map((c) => ({
      x: c.x * cos - c.y * sin + p.x,
      y: c.x * sin + c.y * cos + p.y,
    }));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (selectedId != null) {
      const p = products.find((prod) => prod.id === selectedId);
      if (p) {
        const corners = getProductCorners(p);
        const handleHitRadius = 15;
        const hitCorner = corners.find((c) => Math.sqrt(Math.pow(pos.x - c.x, 2) + Math.pow(pos.y - c.y, 2)) <= handleHitRadius);
        if (hitCorner) {
          interactionMode.current = "resize";
          const distToCenter = Math.sqrt(Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2));
          initialDragData.current = { startX: pos.x, startY: pos.y, initialScale: p.scale, initialDist: distToCenter };
          return;
        }
      }
    }

    const clickedProduct = [...products]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((p) => {
        const rad = -(p.rotation * Math.PI) / 180;
        const dx = pos.x - p.x;
        const dy = pos.y - p.y;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
        const halfW = (p.width * p.scale) / 2;
        const halfH = (p.height * p.scale) / 2;
        return Math.abs(localX) <= halfW && Math.abs(localY) <= halfH;
      });

    if (clickedProduct) {
      setSelectedId(clickedProduct.id);
      interactionMode.current = "move";
      initialDragData.current = { startX: pos.x, startY: pos.y, initialScale: 1, initialDist: 0 };
      const maxZ = Math.max(...products.map((p) => p.zIndex), 0);
      setProducts((prev) => prev.map((p) => (p.id === clickedProduct.id ? { ...p, zIndex: maxZ + 1 } : p)));
    } else {
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (selectedId == null) return;
    if (interactionMode.current === "none") return;
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (interactionMode.current === "move") {
      const dx = pos.x - initialDragData.current.startX;
      const dy = pos.y - initialDragData.current.startY;
      setProducts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, x: p.x + dx, y: p.y + dy } : p)));
      initialDragData.current.startX = pos.x;
      initialDragData.current.startY = pos.y;
    } else if (interactionMode.current === "resize") {
      const p = products.find((prod) => prod.id === selectedId);
      if (!p) return;
      const currentDist = Math.sqrt(Math.pow(pos.x - p.x, 2) + Math.pow(pos.y - p.y, 2));
      const scaleRatio = currentDist / initialDragData.current.initialDist;
      let newScale = initialDragData.current.initialScale * scaleRatio;
      newScale = Math.max(0.2, Math.min(newScale, 5.0));
      setProducts((prev) => prev.map((item) => (item.id === selectedId ? { ...item, scale: newScale } : item)));
    }
  };

  const handleMouseUp = () => {
    interactionMode.current = "none";
  };

  const updateSelected = (key: keyof ProductItem, value: number) => {
    if (selectedId == null) return;
    setProducts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, [key]: value } : p)));
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "smart-box-packing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const selectedProduct = products.find((p) => p.id === selectedId);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="비주얼 박스 패킹"
        description="상품 이미지를 3D 박스에 배치하고 PNG로 다운로드하는 비주얼 도구입니다."
        helpTitle="비주얼 박스 패킹 (Visual Box Packing)"
        helpLines={[
          "상품 사진을 업로드하면 박스에 자동 배치합니다.",
          "흰색 배경 자동 제거, 드래그/리사이즈, 채움비율 조절이 가능합니다.",
          "결과를 PNG 이미지로 다운로드할 수 있습니다.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  이미지 입력
                </CardTitle>
                <HelpTip title="이미지 업로드" lines={["파일 업로드 또는 URL로 상품 이미지를 추가합니다.", "여러 파일을 한번에 업로드할 수 있습니다."]} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-600" />
                  <Label className="text-sm font-medium">흰색 배경 제거</Label>
                  <HelpTip title="배경 제거" lines={["Flood Fill 알고리즘으로 흰색 테두리를 자동 제거합니다.", "상품 이미지 배경이 흰색인 경우 효과적입니다."]} />
                </div>
                <Switch checked={removeBg} onCheckedChange={setRemoveBg} data-testid="switch-remove-bg" />
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-md cursor-pointer border-muted-foreground/25 hover-elevate transition-colors" data-testid="label-file-upload">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground font-medium">상품 사진 업로드</p>
                    <p className="text-xs text-muted-foreground">여러 파일 선택 가능</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} data-testid="input-file-upload" />
                </label>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="이미지 URL 입력..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
                  data-testid="input-image-url"
                />
                <Button variant="outline" size="icon" onClick={handleUrlAdd} disabled={!imageUrlInput.trim()} data-testid="button-add-url">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Maximize className="w-4 h-4" />
                  채움 비율
                </CardTitle>
                <HelpTip title="채움 비율" lines={["슬라이더를 조절하면 상품이 박스를 채우는 비율이 달라집니다.", "높이면 더 꽉 차게 배치됩니다."]} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">비율</span>
                <span className="font-mono font-medium">{Math.round(fillRatio * 100)}%</span>
              </div>
              <Slider
                value={[fillRatio]}
                onValueChange={([v]) => setFillRatio(v)}
                min={0.8}
                max={3.0}
                step={0.1}
                data-testid="slider-fill-ratio"
              />
              <p className="text-xs text-muted-foreground text-center">비율을 높이면 박스가 꽉 찹니다.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  상품 목록
                </CardTitle>
                <span className="text-xs text-muted-foreground">({products.length}개)</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {products.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">이미지를 업로드하세요.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {products.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm cursor-pointer ${p.id === selectedId ? "border-primary bg-accent" : ""}`}
                      onClick={() => setSelectedId(p.id)}
                      data-testid={`item-product-${i}`}
                    >
                      <img src={p.src} className="w-8 h-8 object-contain rounded shrink-0" alt="" />
                      <span className="flex-1 truncate text-xs">상품 {i + 1}</span>
                      <span className="text-xs text-muted-foreground">x{p.scale.toFixed(1)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProducts((prev) => prev.filter((item) => item.id !== p.id));
                          if (selectedId === p.id) setSelectedId(null);
                        }}
                        data-testid={`button-delete-product-${i}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedProduct && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">선택 상품 조절</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">크기 (Scale)</Label>
                  <Slider
                    value={[selectedProduct.scale]}
                    onValueChange={([v]) => updateSelected("scale", v)}
                    min={0.2}
                    max={5.0}
                    step={0.1}
                    data-testid="slider-scale"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">회전 (Rotation)</Label>
                  <Slider
                    value={[selectedProduct.rotation]}
                    onValueChange={([v]) => updateSelected("rotation", v)}
                    min={-180}
                    max={180}
                    step={1}
                    data-testid="slider-rotation"
                  />
                </div>
                <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={deleteSelected} data-testid="button-delete-selected">
                  <Trash2 className="w-3 h-3" />
                  선택 삭제
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  미리보기
                </CardTitle>
                <HelpTip title="미리보기" lines={["캔버스에서 상품을 드래그하여 위치를 조절합니다.", "모서리 핸들을 드래그하면 크기를 조절할 수 있습니다."]} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleAutoPack} className="gap-1.5" data-testid="button-auto-pack">
                  <RefreshCcw className="w-3 h-3" />
                  자동 배치
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setProducts([]); setSelectedId(null); }} className="gap-1.5" data-testid="button-reset-smart">
                  <Trash2 className="w-3 h-3" />
                  초기화
                </Button>
                <Button size="sm" onClick={downloadImage} className="gap-1.5" disabled={products.length === 0} data-testid="button-download-smart-png">
                  <Download className="w-3 h-3" />
                  PNG 다운로드
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center bg-muted/30 rounded-md p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="rounded-md border border-border bg-background cursor-crosshair"
                style={{ maxWidth: "100%", height: "auto" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                data-testid="canvas-smart-box"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>상품: {products.length}개</span>
              <span>채움: {Math.round(fillRatio * 100)}%</span>
              {selectedId != null && <span>선택됨: 상품 #{products.findIndex((p) => p.id === selectedId) + 1}</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
