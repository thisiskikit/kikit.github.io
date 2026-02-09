import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, Clock } from "lucide-react";
import type { DraftSession } from "@shared/schema";

export default function ExportPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scope, setScope] = useState("allFiltered");
  const { toast } = useToast();
  const [exportHistory, setExportHistory] = useState<{ date: string; note: string }[]>([]);

  const { data: sessions } = useQuery<DraftSession[]>({
    queryKey: ["/api/draft/sessions"],
  });

  const exportXlsx = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/export/xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, scope }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Export 실패");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kikit-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
    onSuccess: () => {
      setExportHistory(prev => [
        { date: new Date().toLocaleString("ko-KR"), note: `세션: ${sessionId?.slice(0, 8)}... / 범위: ${scope}` },
        ...prev,
      ]);
      toast({ title: "완료", description: "엑셀 파일이 다운로드됩니다." });
    },
    onError: (err: any) => {
      toast({ title: "Export 실패", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="내보내기 (Export)"
        description="검증을 통과한 데이터를 엑셀(xlsx) 파일로 내보냅니다."
        helpTitle="Export (엑셀로 뽑기)"
        helpLines={[
          "Draft에서 수정한 상품 데이터를 xlsx 파일로 다운로드합니다.",
          "Export 전에 검증(Validate)을 통과해야 합니다.",
          "에러가 있으면 Export 버튼이 비활성화됩니다.",
        ]}
      />

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Select value={sessionId || ""} onValueChange={setSessionId}>
                <SelectTrigger className="w-[260px]" data-testid="select-export-session">
                  <SelectValue placeholder="세션 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {(sessions || []).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.note || "세션"} ({new Date(s.createdAt).toLocaleDateString("ko-KR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelpTip title="세션 선택" lines={["내보낼 Draft 세션을 선택합니다."]} />
            </div>

            <div className="flex items-center gap-1.5">
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-[180px]" data-testid="select-export-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allFiltered">세션 전체</SelectItem>
                  <SelectItem value="selected">선택된 항목만</SelectItem>
                </SelectContent>
              </Select>
              <HelpTip title="내보내기 범위(Scope)" lines={["세션 전체: 모든 Draft 항목을 내보냅니다.", "선택된 항목만: 이전에 선택한 상품만 내보냅니다."]} />
            </div>
          </div>

          <Button
            onClick={() => exportXlsx.mutate()}
            disabled={!sessionId || exportXlsx.isPending}
            className="gap-2"
            data-testid="button-export-xlsx"
          >
            {exportXlsx.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            엑셀 파일 다운로드 (.xlsx)
            <HelpTip title="엑셀 다운로드" lines={["검증 후 xlsx 파일을 생성하여 브라우저에서 다운로드합니다.", "에러가 있으면 다운로드가 차단됩니다."]} />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              최근 내보내기 기록
            </CardTitle>
            <HelpTip title="내보내기 기록" lines={["이번 세션에서 실행한 Export 이력입니다.", "브라우저를 새로고침하면 초기화됩니다."]} />
          </div>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="w-10 h-10 mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">아직 내보내기 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {exportHistory.map((h, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border text-sm">
                  <Badge variant="outline" className="text-xs">{h.date}</Badge>
                  <span className="text-muted-foreground text-xs">{h.note}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
