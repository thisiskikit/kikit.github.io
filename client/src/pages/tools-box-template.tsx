import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Box, Download, RefreshCcw } from "lucide-react";
import {
  BOX_PRESETS,
  drawBoxBack,
  drawBoxFront,
  type BoxPalette,
  type BoxRenderOptions,
  type BoxStyleId,
} from "@/lib/box-renderer";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 700;
const CUSTOM_TEMPLATE_STORAGE_KEY = "kikit.customBoxTemplate";
const CUSTOM_BOX_PNG_STORAGE_KEY = "kikit.customBoxPng";
const CUSTOM_BOX_SETTINGS_KEY = "kikit.customBoxSettings";

export default function BoxTemplatePage() {
  const [boxStyle, setBoxStyle] = useState<BoxStyleId>("classic");
  const [boxPalette, setBoxPalette] = useState<BoxPalette>({ ...BOX_PRESETS.classic.palette });
  const [boxLabel, setBoxLabel] = useState(BOX_PRESETS.classic.label);
  const [boxStamp, setBoxStamp] = useState(BOX_PRESETS.classic.stamp);
  const [showStamp, setShowStamp] = useState(true);
  const [boxScale, setBoxScale] = useState(1.0);
  const [boxPerspective, setBoxPerspective] = useState(1.0);
  const [transparentBg, setTransparentBg] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const applyPreset = (presetId: BoxStyleId) => {
    const preset = BOX_PRESETS[presetId];
    setBoxStyle(presetId);
    setBoxPalette({ ...preset.palette });
    setBoxLabel(preset.label);
    setBoxStamp(preset.stamp);
    setShowStamp(Boolean(preset.stamp));
  };

  const resetCurrentPreset = () => {
    applyPreset(boxStyle);
  };

  const updatePalette = (key: keyof BoxPalette, value: string) => {
    setBoxPalette((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!transparentBg) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 50;
    const options: BoxRenderOptions = {
      presetId: boxStyle,
      palette: boxPalette,
      label: boxLabel,
      stamp: boxStamp,
      showStamp,
      scale: boxScale,
      perspective: boxPerspective,
    };

    drawBoxBack(ctx, cx, cy, options);
    drawBoxFront(ctx, cx, cy, options);
  }, [boxStyle, boxPalette, boxLabel, boxStamp, showStamp, boxScale, boxPerspective, transparentBg]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "custom-box.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const saveForVisualPacking = () => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      window.localStorage.setItem(CUSTOM_BOX_PNG_STORAGE_KEY, dataUrl);

      const rawSettings = window.localStorage.getItem(CUSTOM_BOX_SETTINGS_KEY);
      if (rawSettings) {
        try {
          const parsed = JSON.parse(rawSettings) as Record<string, unknown>;
          window.localStorage.setItem(
            CUSTOM_BOX_SETTINGS_KEY,
            JSON.stringify({ ...parsed, enabled: true }),
          );
        } catch {
          window.localStorage.setItem(CUSTOM_BOX_SETTINGS_KEY, JSON.stringify({ enabled: true }));
        }
      } else {
        window.localStorage.setItem(CUSTOM_BOX_SETTINGS_KEY, JSON.stringify({ enabled: true }));
      }
    } catch {
      // ignore storage failures
    }
  };

  const saveTemplate = () => {
    if (typeof window === "undefined") return;
    const options: BoxRenderOptions = {
      presetId: boxStyle,
      palette: boxPalette,
      label: boxLabel,
      stamp: boxStamp,
      showStamp,
      scale: boxScale,
      perspective: boxPerspective,
    };
    try {
      window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(options));
    } catch {
      // ignore storage failures
    }
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="커스텀 박스 만들기"
        description="박스 디자인을 커스터마이즈하고 투명 PNG로 저장합니다."
        helpTitle="커스텀 박스 만들기"
        helpLines={[
          "프리셋을 고르고 색상/라벨/스탬프를 조절하세요.",
          "투명 배경으로 저장하면 박스 패킹에서 바로 사용할 수 있습니다.",
          "템플릿 저장을 누르면 비주얼 박스 패킹에서 기본 박스로 선택할 수 있습니다.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  박스 스타일
                </CardTitle>
                <Button variant="outline" size="sm" onClick={resetCurrentPreset} className="gap-1.5">
                  <RefreshCcw className="w-3 h-3" />
                  기본값
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.values(BOX_PRESETS).map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant={boxStyle === preset.id ? "default" : "outline"}
                    className="h-auto justify-start py-2"
                    onClick={() => applyPreset(preset.id)}
                  >
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-semibold">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">외부색</Label>
                  <Input
                    type="color"
                    value={boxPalette.outer}
                    onChange={(e) => updatePalette("outer", e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">내부색</Label>
                  <Input
                    type="color"
                    value={boxPalette.inner}
                    onChange={(e) => updatePalette("inner", e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">포인트</Label>
                  <Input
                    type="color"
                    value={boxPalette.accent}
                    onChange={(e) => updatePalette("accent", e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">라벨색</Label>
                  <Input
                    type="color"
                    value={boxPalette.label}
                    onChange={(e) => updatePalette("label", e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                {boxStyle === "tape" && (
                  <div className="space-y-1">
                    <Label className="text-xs">테이프색</Label>
                    <Input
                      type="color"
                      value={boxPalette.tape}
                      onChange={(e) => updatePalette("tape", e.target.value)}
                      className="h-9 p-1"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">박스 크기</span>
                    <span className="font-mono font-medium">{Math.round(boxScale * 100)}%</span>
                  </div>
                  <Slider value={[boxScale]} onValueChange={([v]) => setBoxScale(v)} min={0.7} max={1.4} step={0.05} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">원근감</span>
                    <span className="font-mono font-medium">{Math.round(boxPerspective * 100)}%</span>
                  </div>
                  <Slider value={[boxPerspective]} onValueChange={([v]) => setBoxPerspective(v)} min={0.7} max={1.4} step={0.05} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">라벨 텍스트</Label>
                <Input value={boxLabel} onChange={(e) => setBoxLabel(e.target.value)} placeholder="라벨 텍스트 입력" />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">스탬프</Label>
                <Switch checked={showStamp} onCheckedChange={setShowStamp} />
              </div>
              {showStamp && (
                <Input value={boxStamp} onChange={(e) => setBoxStamp(e.target.value)} placeholder="스탬프 텍스트" />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">투명 배경</Label>
                  <HelpTip title="투명 배경" lines={["투명 배경 PNG로 저장하면 박스 패킹에 올리기 좋습니다."]} />
                </div>
                <Switch checked={transparentBg} onCheckedChange={setTransparentBg} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                미리보기
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveTemplate} className="gap-1.5" data-testid="button-save-template">
                  <Box className="w-3 h-3" />
                  템플릿 저장
                </Button>
                <Button variant="outline" size="sm" onClick={saveForVisualPacking} className="gap-1.5" data-testid="button-save-visual-box">
                  <Box className="w-3 h-3" />
                  비주얼 박스 적용
                </Button>
                <Button size="sm" onClick={downloadPng} className="gap-1.5">
                  <Download className="w-3 h-3" />
                  PNG 저장
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center bg-background rounded-md p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="rounded-md border border-border bg-transparent"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>스타일: {BOX_PRESETS[boxStyle].name}</span>
              <span>크기: {Math.round(boxScale * 100)}%</span>
              <span>원근감: {Math.round(boxPerspective * 100)}%</span>
              <span>{transparentBg ? "투명 배경" : "흰색 배경"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
