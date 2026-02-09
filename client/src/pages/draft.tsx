import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, RotateCcw, FileEdit, ArrowLeftRight, Layers } from "lucide-react";
import type { DraftSession, DraftItem, CoupangProduct } from "@shared/schema";

interface DraftItemWithProduct extends DraftItem {
  product?: CoupangProduct;
}

export default function DraftPage() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editPatch, setEditPatch] = useState<Record<string, any>>({});
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [bulkField, setBulkField] = useState("status");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const { data: sessions, isLoading: sessionsLoading } = useQuery<DraftSession[]>({
    queryKey: ["/api/draft/sessions"],
  });

  const { data: draftData, isLoading: itemsLoading } = useQuery<DraftItemWithProduct[]>({
    queryKey: ["/api/draft/session", sessionId],
    enabled: !!sessionId,
  });

  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/draft/session", { note: "새 작업 세션", created_by: "ui-user" });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/draft/sessions"] });
      toast({ title: "세션 생성됨", description: "새 Draft 세션이 생성되었습니다." });
    },
  });

  const applyPatch = useMutation({
    mutationFn: async ({ productId, patch }: { productId: string; patch: Record<string, any> }) => {
      await apiRequest("PATCH", "/api/draft/apply", {
        sessionId,
        productId,
        patch,
        actor: "ui-user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft/session", sessionId] });
      toast({ title: "저장됨", description: "변경사항이 Draft에 저장되었습니다." });
    },
  });

  const bulkApply = useMutation({
    mutationFn: async () => {
      for (const pid of bulkSelected) {
        await apiRequest("PATCH", "/api/draft/apply", {
          sessionId,
          productId: pid,
          patch: { [bulkField]: bulkValue },
          actor: "ui-user",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft/session", sessionId] });
      setBulkSelected(new Set());
      toast({ title: "대량 수정 완료", description: `${bulkSelected.size}개 상품이 수정되었습니다.` });
    },
  });

  const rollback = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/draft/rollback", { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/draft/session", sessionId] });
      toast({ title: "롤백 완료", description: "세션의 모든 변경사항이 초기화되었습니다." });
    },
  });

  const items = draftData || [];
  const filteredItems = showChangedOnly ? items.filter(i => i.patchJson && Object.keys(i.patchJson as Record<string, any>).length > 0) : items;
  const selectedItem = items.find(i => i.productId === selectedItemId);
  const selectedProduct = selectedItem?.product;
  const patchJson = (selectedItem?.patchJson || {}) as Record<string, any>;

  useEffect(() => {
    if (selectedItem && selectedProduct) {
      setEditPatch({ ...patchJson });
    }
  }, [selectedItemId]);

  useEffect(() => {
    if (sessions && sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions]);

  const editFields = [
    { key: "product_name", label: "상품명", help: "쿠팡에 표시되는 상품 이름입니다." },
    { key: "price", label: "판매가", help: "원래 판매 가격입니다." },
    { key: "sale_price", label: "할인가", help: "할인 적용 후 실제 판매 가격입니다." },
    { key: "status", label: "상태", help: "판매중(active)/판매중지(inactive)/품절(soldout)" },
    { key: "option_text", label: "옵션", help: "상품 옵션 정보입니다." },
    { key: "memo", label: "메모", help: "내부 관리용 메모입니다." },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Draft (임시 수정본)"
        description="선택한 상품의 정보를 수정하고 변경 이력을 관리합니다."
        helpTitle="Draft (임시 수정본)"
        helpLines={[
          "상품 목록에서 선택한 상품을 편집하는 공간입니다.",
          "세션 단위로 변경사항을 관리하며, 롤백이 가능합니다.",
          "수정 후 검증(Validate) → 내보내기(Export) 순서로 진행합니다.",
        ]}
      />

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          <Select value={sessionId || ""} onValueChange={setSessionId}>
            <SelectTrigger className="w-[260px]" data-testid="select-session">
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
          <HelpTip title="작업 세션" lines={["작업을 묶어서 관리하는 단위입니다.", "세션별로 롤백이 가능합니다."]} />
        </div>
        <Button size="sm" variant="outline" onClick={() => createSession.mutate()} className="gap-1.5" data-testid="button-new-session">
          <Plus className="w-3.5 h-3.5" />
          새 세션
        </Button>
        {sessionId && (
          <Button size="sm" variant="outline" onClick={() => rollback.mutate()} className="gap-1.5 text-destructive" data-testid="button-rollback">
            <RotateCcw className="w-3.5 h-3.5" />
            롤백
            <HelpTip title="롤백(Rollback)" lines={["이 세션의 모든 변경사항을 삭제합니다.", "원본 데이터는 영향받지 않습니다."]} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">상품 리스트</CardTitle>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={showChangedOnly} onCheckedChange={(c) => setShowChangedOnly(!!c)} data-testid="checkbox-changed-only" />
                  변경됨만
                </label>
                <HelpTip title="변경됨 필터" lines={["수정된 항목만 표시합니다."]} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
            {itemsLoading || sessionsLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {sessionId ? "이 세션에 상품이 없습니다." : "세션을 선택하세요."}
              </p>
            ) : (
              filteredItems.map(item => {
                const hasPatch = item.patchJson && Object.keys(item.patchJson as Record<string, any>).length > 0;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                      selectedItemId === item.productId ? "border-ring bg-accent/40" : ""
                    }`}
                    onClick={() => setSelectedItemId(item.productId)}
                    data-testid={`draft-item-${item.productId}`}
                  >
                    <Checkbox
                      checked={bulkSelected.has(item.productId)}
                      onCheckedChange={() => {
                        setBulkSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(item.productId)) next.delete(item.productId);
                          else next.add(item.productId);
                          return next;
                        });
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.product?.product_name || item.productId}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.productId}</p>
                    </div>
                    {hasPatch && <Badge variant="outline" className="text-xs shrink-0">수정됨</Badge>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  <FileEdit className="w-4 h-4 inline mr-1.5" />
                  편집
                </CardTitle>
                <HelpTip title="상품 편집" lines={["필드를 수정하면 원본 대비 변경분(Patch)만 저장됩니다.", "저장 버튼을 눌러야 반영됩니다."]} />
              </div>
              {selectedItem && (
                <Button
                  size="sm"
                  onClick={() => applyPatch.mutate({ productId: selectedItemId!, patch: editPatch })}
                  disabled={applyPatch.isPending}
                  className="gap-1.5"
                  data-testid="button-save-draft"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedItem ? (
              <p className="text-sm text-muted-foreground text-center py-12">좌측 리스트에서 상품을 선택하세요.</p>
            ) : (
              <div className="space-y-4">
                {editFields.map(f => {
                  const origValue = selectedProduct ? (selectedProduct as any)[f.key] : "";
                  const patchValue = patchJson[f.key];
                  const currentValue = editPatch[f.key] !== undefined ? editPatch[f.key] : (patchValue !== undefined ? patchValue : origValue);
                  const isChanged = patchValue !== undefined && patchValue !== origValue;
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-medium">{f.label}</Label>
                        <HelpTip title={f.label} lines={[f.help]} />
                        {isChanged && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <ArrowLeftRight className="w-3 h-3" />
                            변경됨
                          </Badge>
                        )}
                      </div>
                      {f.key === "status" ? (
                        <Select value={String(currentValue || "")} onValueChange={v => setEditPatch(prev => ({ ...prev, [f.key]: v }))}>
                          <SelectTrigger data-testid={`input-${f.key}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">판매중</SelectItem>
                            <SelectItem value="inactive">판매중지</SelectItem>
                            <SelectItem value="soldout">품절</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={String(currentValue ?? "")}
                          onChange={e => setEditPatch(prev => ({ ...prev, [f.key]: e.target.value }))}
                          data-testid={`input-${f.key}`}
                        />
                      )}
                      {isChanged && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="line-through">{String(origValue)}</span>
                          <span>→</span>
                          <span className="font-medium">{String(patchValue)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {bulkSelected.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                <Layers className="w-4 h-4 inline mr-1.5" />
                대량 수정 ({bulkSelected.size}개 선택)
              </CardTitle>
              <HelpTip title="대량 수정(Bulk Edit)" lines={["선택한 모든 상품에 동일한 값을 일괄 적용합니다.", "필드를 선택하고 값을 입력 후 적용하세요."]} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">필드</Label>
                <Select value={bulkField} onValueChange={setBulkField}>
                  <SelectTrigger className="w-[140px]" data-testid="select-bulk-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">상태</SelectItem>
                    <SelectItem value="price">판매가</SelectItem>
                    <SelectItem value="sale_price">할인가</SelectItem>
                    <SelectItem value="memo">메모</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label className="text-xs">값</Label>
                {bulkField === "status" ? (
                  <Select value={bulkValue} onValueChange={setBulkValue}>
                    <SelectTrigger data-testid="input-bulk-value">
                      <SelectValue placeholder="상태 선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">판매중</SelectItem>
                      <SelectItem value="inactive">판매중지</SelectItem>
                      <SelectItem value="soldout">품절</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="적용할 값..." data-testid="input-bulk-value" />
                )}
              </div>
              <Button onClick={() => bulkApply.mutate()} disabled={!bulkValue || bulkApply.isPending} data-testid="button-bulk-apply">
                일괄 적용
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
