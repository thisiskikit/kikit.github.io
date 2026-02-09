import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, XCircle, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";
import type { DraftSession, ValidationResult } from "@shared/schema";

export default function ValidatePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const { data: sessions } = useQuery<DraftSession[]>({
    queryKey: ["/api/draft/sessions"],
  });

  const validate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/validate", {
        sessionId,
        scope: "allFiltered",
      });
      return res.json() as Promise<ValidationResult>;
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="검증 (Validate)"
        description="Export 전에 필수값 누락, 가격 오류 등을 검사합니다."
        helpTitle="검증 (Validation)"
        helpLines={[
          "수정한 상품 데이터의 오류를 검사합니다.",
          "에러가 있으면 Export(엑셀 내보내기)가 차단됩니다.",
          "경고(Warning)는 내보내기를 막지 않지만 확인이 필요합니다.",
        ]}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Select value={sessionId || ""} onValueChange={setSessionId}>
                <SelectTrigger className="w-[260px]" data-testid="select-validate-session">
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
              <HelpTip title="세션 선택" lines={["검증할 Draft 세션을 선택합니다."]} />
            </div>
            <Button
              onClick={() => validate.mutate()}
              disabled={!sessionId || validate.isPending}
              className="gap-2"
              data-testid="button-run-validate"
            >
              {validate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              검증 실행
              <HelpTip title="검증 실행" lines={["선택한 세션의 모든 상품을 검사합니다.", "필수값 누락/가격 오류 등을 체크합니다."]} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {validate.isPending && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {result && (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                {result.canExport ? (
                  <Badge variant="default" className="gap-1.5 text-sm py-1">
                    <CheckCircle className="w-4 h-4" />
                    Export 가능
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 text-sm py-1">
                    <XCircle className="w-4 h-4" />
                    Export 불가 — 에러를 먼저 해결하세요
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  에러 {result.errors.length}건 · 경고 {result.warnings.length}건
                </span>
              </div>
            </CardContent>
          </Card>

          {result.errors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-red-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    에러 ({result.errors.length})
                  </CardTitle>
                  <HelpTip title="에러(Error)" lines={["반드시 수정해야 하는 항목입니다.", "에러가 있으면 Export가 차단됩니다."]} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border border-red-500/20 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{err.productId}</span>
                    <Badge variant="outline" className="text-xs">{err.field}</Badge>
                    <span className="text-red-400">{err.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.warnings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-yellow-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    경고 ({result.warnings.length})
                  </CardTitle>
                  <HelpTip title="경고(Warning)" lines={["확인이 필요하지만 Export를 막지는 않습니다.", "가능하면 수정을 권장합니다."]} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {result.warnings.map((warn, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border border-yellow-500/20 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{warn.productId}</span>
                    <Badge variant="outline" className="text-xs">{warn.field}</Badge>
                    <span className="text-yellow-400">{warn.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.errors.length === 0 && result.warnings.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-60" />
                  <p className="text-sm font-medium">모든 검증을 통과했습니다!</p>
                  <p className="text-xs text-muted-foreground mt-1">Export 페이지에서 엑셀 파일을 생성할 수 있습니다.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
