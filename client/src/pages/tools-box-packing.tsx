import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, RotateCcw, Box } from "lucide-react";

interface BoxItem {
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
}

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];

export default function BoxPackingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boxWidth, setBoxWidth] = useState(400);
  const [boxHeight, setBoxHeight] = useState(300);
  const [items, setItems] = useState<BoxItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newW, setNewW] = useState(80);
  const [newH, setNewH] = useState(60);

  const addItem = () => {
    if (!newName.trim()) return;
    const item: BoxItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      width: newW,
      height: newH,
      color: COLORS[items.length % COLORS.length],
    };
    setItems(prev => [...prev, item]);
    setNewName("");
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const packItems = useCallback(() => {
    const sorted = [...items].sort((a, b) => b.height - a.height || b.width - a.width);
    const placed: { item: BoxItem; x: number; y: number }[] = [];
    const spaces = [{ x: 0, y: 0, w: boxWidth, h: boxHeight }];

    for (const item of sorted) {
      let bestIdx = -1;
      let bestSpace: any = null;
      for (let i = 0; i < spaces.length; i++) {
        const s = spaces[i];
        if (item.width <= s.w && item.height <= s.h) {
          if (!bestSpace || s.y < bestSpace.y || (s.y === bestSpace.y && s.x < bestSpace.x)) {
            bestIdx = i;
            bestSpace = s;
          }
        }
      }
      if (bestSpace && bestIdx >= 0) {
        placed.push({ item, x: bestSpace.x, y: bestSpace.y });
        spaces.splice(bestIdx, 1);
        spaces.push({ x: bestSpace.x + item.width, y: bestSpace.y, w: bestSpace.w - item.width, h: item.height });
        spaces.push({ x: bestSpace.x, y: bestSpace.y + item.height, w: bestSpace.w, h: bestSpace.h - item.height });
        spaces.sort((a, b) => a.y - b.y || a.x - b.x);
      }
    }
    return placed;
  }, [items, boxWidth, boxHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = window.devicePixelRatio || 1;
    canvas.width = boxWidth * scale;
    canvas.height = boxHeight * scale;
    canvas.style.width = `${boxWidth}px`;
    canvas.style.height = `${boxHeight}px`;
    ctx.scale(scale, scale);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, boxWidth, boxHeight);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let x = 0; x < boxWidth; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, boxHeight); ctx.stroke(); }
    for (let y = 0; y < boxHeight; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(boxWidth, y); ctx.stroke(); }

    const placed = packItems();
    for (const { item, x, y } of placed) {
      ctx.fillStyle = item.color + "cc";
      ctx.fillRect(x + 1, y + 1, item.width - 2, item.height - 2);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, item.width - 2, item.height - 2);
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.name, x + item.width / 2, y + item.height / 2 + 4, item.width - 8);
    }
  }, [items, boxWidth, boxHeight, packItems]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "box-packing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="스마트 박스 패킹"
        description="상품을 박스에 최적으로 배치하는 시뮬레이션 도구입니다."
        helpTitle="박스 패킹(Box Packing)"
        helpLines={[
          "상품의 크기를 입력하면 박스 안에 자동 배치합니다.",
          "배치 결과를 PNG로 다운로드할 수 있습니다.",
          "포장 최적화에 활용하세요.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">박스 설정</CardTitle>
              <HelpTip title="박스 크기" lines={["포장 박스의 너비와 높이를 설정합니다.", "단위: 픽셀 (실제 mm로 환산 가능)"]} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">너비 (px)</Label>
                <Input type="number" value={boxWidth} onChange={e => setBoxWidth(Number(e.target.value))} data-testid="input-box-width" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">높이 (px)</Label>
                <Input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} data-testid="input-box-height" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">상품 추가</Label>
                <HelpTip title="상품 추가" lines={["박스에 넣을 상품의 이름과 크기를 입력합니다."]} />
              </div>
              <Input placeholder="상품명" value={newName} onChange={e => setNewName(e.target.value)} data-testid="input-item-name" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="너비" value={newW} onChange={e => setNewW(Number(e.target.value))} data-testid="input-item-width" />
                <Input type="number" placeholder="높이" value={newH} onChange={e => setNewH(Number(e.target.value))} data-testid="input-item-height" />
              </div>
              <Button onClick={addItem} className="w-full gap-1.5" disabled={!newName.trim()} data-testid="button-add-item">
                <Plus className="w-3.5 h-3.5" />
                추가
              </Button>
            </div>

            <div className="border-t pt-3 space-y-1">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">상품을 추가하세요.</p>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.width}x{item.height}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  미리보기
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setItems([])} className="gap-1.5" data-testid="button-reset-packing">
                  <RotateCcw className="w-3 h-3" />
                  초기화
                </Button>
                <Button size="sm" onClick={downloadPng} className="gap-1.5" data-testid="button-download-png">
                  <Download className="w-3 h-3" />
                  PNG 다운로드
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center bg-background rounded-md p-4 overflow-auto">
              <canvas ref={canvasRef} className="rounded-md border border-border" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>박스: {boxWidth} x {boxHeight}px</span>
              <span>상품: {items.length}개</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
