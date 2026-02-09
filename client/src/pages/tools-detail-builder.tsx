import { useState, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Plus, Trash2, MoveUp, MoveDown, FileImage } from "lucide-react";

interface Block {
  id: string;
  type: "title" | "text" | "image" | "divider" | "specs";
  content: string;
}

export default function DetailBuilderPage() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "1", type: "title", content: "상품 상세 정보" },
    { id: "2", type: "text", content: "고품질 소재로 제작된 프리미엄 제품입니다." },
    { id: "3", type: "divider", content: "" },
    { id: "4", type: "specs", content: "소재: 면 100%\n사이즈: FREE\n무게: 200g" },
  ]);
  const [newType, setNewType] = useState<Block["type"]>("text");

  const addBlock = () => {
    setBlocks(prev => [...prev, { id: Date.now().toString(), type: newType, content: "" }]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const downloadHtml = () => {
    if (!previewRef.current) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; color: #333; }
      h1 { font-size: 24px; font-weight: bold; margin: 20px 0; }
      p { font-size: 14px; line-height: 1.8; margin: 10px 0; }
      hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
      td:first-child { background: #f8f8f8; font-weight: bold; width: 30%; }
      img { max-width: 100%; margin: 10px 0; }
    </style></head><body>${previewRef.current.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "detail-page.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case "title": return <h1 style={{ fontSize: 24, fontWeight: "bold", margin: "20px 0" }}>{block.content || "제목을 입력하세요"}</h1>;
      case "text": return <p style={{ fontSize: 14, lineHeight: 1.8, margin: "10px 0", whiteSpace: "pre-wrap" }}>{block.content || "텍스트를 입력하세요"}</p>;
      case "divider": return <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0" }} />;
      case "image": return block.content ? <img src={block.content} alt="상품 이미지" style={{ maxWidth: "100%", margin: "10px 0" }} /> : <div style={{ background: "#f0f0f0", height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", margin: "10px 0" }}>이미지 URL을 입력하세요</div>;
      case "specs": {
        const lines = (block.content || "").split("\n").filter(Boolean);
        return (
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0" }}>
            <tbody>
              {lines.map((line, i) => {
                const [key, ...rest] = line.split(":");
                return (
                  <tr key={i}>
                    <td style={{ padding: "8px 12px", border: "1px solid #ddd", background: "#f8f8f8", fontWeight: "bold", width: "30%", fontSize: 13 }}>{key?.trim()}</td>
                    <td style={{ padding: "8px 12px", border: "1px solid #ddd", fontSize: 13 }}>{rest.join(":").trim()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      }
    }
  };

  const typeLabels: Record<string, string> = { title: "제목", text: "텍스트", image: "이미지", divider: "구분선", specs: "스펙 표" };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="상세페이지 빌더"
        description="상품 상세페이지 HTML을 블록 단위로 조립합니다."
        helpTitle="상세페이지 빌더(Detail Builder)"
        helpLines={[
          "제목/텍스트/이미지/스펙표 블록을 조합하여 상세페이지를 구성합니다.",
          "미리보기를 확인하고 HTML 파일로 다운로드할 수 있습니다.",
          "쿠팡 상세페이지 등록용으로 활용하세요.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">블록 편집</CardTitle>
                <HelpTip title="블록 편집" lines={["각 블록의 내용을 수정합니다.", "순서를 변경하거나 삭제할 수 있습니다."]} />
              </div>
              <div className="flex items-center gap-2">
                <Select value={newType} onValueChange={v => setNewType(v as Block["type"])}>
                  <SelectTrigger className="w-[120px]" data-testid="select-block-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">제목</SelectItem>
                    <SelectItem value="text">텍스트</SelectItem>
                    <SelectItem value="image">이미지</SelectItem>
                    <SelectItem value="divider">구분선</SelectItem>
                    <SelectItem value="specs">스펙 표</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addBlock} className="gap-1.5" data-testid="button-add-block">
                  <Plus className="w-3.5 h-3.5" />
                  추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {blocks.map((block, idx) => (
              <div key={block.id} className="space-y-1.5 p-3 rounded-md border">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs">{typeLabels[block.type]}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}>
                      <MoveUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1}>
                      <MoveDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {block.type === "divider" ? (
                  <p className="text-xs text-muted-foreground">구분선 (내용 없음)</p>
                ) : block.type === "specs" ? (
                  <Textarea
                    value={block.content}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder="키: 값 형식으로 한 줄에 하나씩 입력&#10;소재: 면 100%&#10;사이즈: FREE"
                    rows={4}
                    className="text-xs"
                    data-testid={`textarea-block-${block.id}`}
                  />
                ) : block.type === "image" ? (
                  <Input
                    value={block.content}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder="이미지 URL을 입력하세요..."
                    data-testid={`input-block-${block.id}`}
                  />
                ) : (
                  <Textarea
                    value={block.content}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={block.type === "title" ? "제목 입력..." : "텍스트 입력..."}
                    rows={block.type === "title" ? 1 : 3}
                    className="text-sm"
                    data-testid={`textarea-block-${block.id}`}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  미리보기
                </CardTitle>
              </div>
              <Button size="sm" onClick={downloadHtml} className="gap-1.5" data-testid="button-download-html">
                <Download className="w-3 h-3" />
                HTML 다운로드
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={previewRef} className="bg-white text-gray-900 rounded-md p-6 min-h-[400px] max-h-[600px] overflow-y-auto" style={{ fontFamily: "sans-serif" }}>
              {blocks.map(block => (
                <div key={block.id}>{renderBlock(block)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
