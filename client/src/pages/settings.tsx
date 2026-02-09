import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Database, Cloud, Shield, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const { data: status } = useQuery<{
    mockMode: boolean;
    pgConnected: boolean;
    bqConnected: boolean;
  }>({
    queryKey: ["/api/settings/status"],
  });

  const validationRules = [
    { id: "required_fields", label: "필수값 검사", desc: "상품명, 가격 등 필수 필드의 누락 여부를 검사합니다.", enabled: true },
    { id: "price_check", label: "가격 유효성", desc: "가격이 0 이하인 항목을 에러로 표시합니다.", enabled: true },
    { id: "name_length", label: "상품명 길이 제한", desc: "상품명이 100자를 초과하면 경고를 표시합니다.", enabled: true },
    { id: "category_match", label: "카테고리 매칭", desc: "카테고리 ID가 마스터 데이터와 일치하는지 검사합니다.", enabled: false },
    { id: "image_check", label: "이미지 URL 검사", desc: "메인 이미지 URL이 유효한지 검사합니다.", enabled: false },
  ];

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="설정 (Settings)"
        description="데이터소스 연결 상태, 검증 룰 등을 관리합니다."
        helpTitle="설정 페이지"
        helpLines={[
          "앱의 데이터소스 연결 상태를 확인합니다.",
          "검증 룰을 켜고 끌 수 있습니다 (초안은 UI만).",
          "MOCK_MODE는 환경변수로 제어합니다.",
        ]}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              데이터소스 상태
            </CardTitle>
            <HelpTip title="데이터소스(Data Source)" lines={["앱이 연결하는 외부 데이터 저장소입니다.", "BigQuery: 쿠팡 상품 읽기 전용", "PostgreSQL: 드래프트/로그/작업 관리"]} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">MOCK_MODE</span>
              <HelpTip title="MOCK_MODE (모의 모드)" lines={["true이면 BigQuery/PG 없이 가상 데이터로 동작합니다.", "환경변수 MOCK_MODE로 제어합니다."]} />
            </div>
            <Badge variant={status?.mockMode ? "default" : "secondary"}>
              {status?.mockMode ? "ON (모의 데이터)" : "OFF (실제 데이터)"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">PostgreSQL</span>
            </div>
            {status?.pgConnected ? (
              <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> 연결됨</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> 미연결</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">BigQuery</span>
            </div>
            {status?.bqConnected ? (
              <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> 연결됨</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> 미연결 (Mock 사용)</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              검증 룰 설정
            </CardTitle>
            <HelpTip title="검증 룰(Validation Rules)" lines={["Export 전 검증 단계에서 적용되는 규칙입니다.", "ON/OFF로 개별 규칙을 제어할 수 있습니다.", "현재 초안은 UI만 제공되며 서버는 기본 룰 고정입니다."]} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {validationRules.map(rule => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border">
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} disabled className="scale-90" />
                <div>
                  <Label className="text-sm">{rule.label}</Label>
                  <p className="text-xs text-muted-foreground">{rule.desc}</p>
                </div>
              </div>
              <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                {rule.enabled ? "활성" : "비활성"}
              </Badge>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">
            * 초안 버전에서는 서버 기본 룰이 고정 적용됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
