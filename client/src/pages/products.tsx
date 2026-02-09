import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Package } from "lucide-react";
import type { CoupangProduct } from "@shared/schema";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 20;
  const { toast } = useToast();

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(page * limit),
    ...(search ? { q: search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  });

  const { data, isLoading } = useQuery<{ items: CoupangProduct[]; total: number }>({
    queryKey: ["/api/coupang/products", `?${params.toString()}`],
  });

  const addToDraft = useMutation({
    mutationFn: async () => {
      const sessionRes = await apiRequest("POST", "/api/draft/session", { note: "상품 목록에서 추가", created_by: "ui-user" });
      const session = await sessionRes.json();
      for (const pid of selected) {
        await apiRequest("PATCH", "/api/draft/apply", {
          sessionId: session.sessionId,
          productId: pid,
          patch: {},
          actor: "ui-user",
        });
      }
      return session;
    },
    onSuccess: () => {
      toast({ title: "완료", description: `${selected.size}개 상품이 Draft에 추가되었습니다.` });
      setSelected(new Set());
    },
    onError: (err: any) => {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (items.every(i => selected.has(i.product_id))) {
      setSelected(prev => {
        const next = new Set(prev);
        items.forEach(i => next.delete(i.product_id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        items.forEach(i => next.add(i.product_id));
        return next;
      });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="쿠팡 상품 목록"
        description="BigQuery에서 조회한 쿠팡 상품 데이터를 검색하고 Draft에 담을 수 있습니다."
        helpTitle="상품 목록 (Products)"
        helpLines={[
          "쿠팡에 등록된 상품을 조회하는 페이지입니다.",
          "검색/필터로 원하는 상품을 찾고 선택하세요.",
          "선택한 상품을 Draft(임시 수정본)에 담아 수정할 수 있습니다.",
        ]}
      >
        <Button
          disabled={selected.size === 0 || addToDraft.isPending}
          onClick={() => addToDraft.mutate()}
          className="gap-2"
          data-testid="button-add-to-draft"
        >
          <ShoppingCart className="w-4 h-4" />
          선택으로 Draft에 담기 ({selected.size})
          <HelpTip
            title="Draft에 담기"
            lines={[
              "선택한 상품을 임시 수정본(Draft)에 추가합니다.",
              "Draft에서 가격/상태 등을 편집할 수 있습니다.",
              "원본 데이터는 변경되지 않습니다.",
            ]}
          />
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="상품명, 코드 등으로 검색..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="active">판매중</SelectItem>
                  <SelectItem value="inactive">판매중지</SelectItem>
                  <SelectItem value="soldout">품절</SelectItem>
                </SelectContent>
              </Select>
              <HelpTip
                title="상태 필터(Status Filter)"
                lines={[
                  "상품의 판매 상태별로 필터링합니다.",
                  "active=판매중, inactive=판매중지, soldout=품절",
                ]}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">조건에 맞는 상품이 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 w-10">
                        <Checkbox
                          checked={items.length > 0 && items.every(i => selected.has(i.product_id))}
                          onCheckedChange={toggleAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="p-2 font-medium">상품코드</th>
                      <th className="p-2 font-medium">상품명</th>
                      <th className="p-2 font-medium">옵션</th>
                      <th className="p-2 font-medium text-right">판매가</th>
                      <th className="p-2 font-medium text-right">할인가</th>
                      <th className="p-2 font-medium">상태</th>
                      <th className="p-2 font-medium">카테고리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr
                        key={item.product_id}
                        className={`border-b transition-colors ${selected.has(item.product_id) ? "bg-accent/30" : ""}`}
                        data-testid={`row-product-${item.product_id}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selected.has(item.product_id)}
                            onCheckedChange={() => toggleSelect(item.product_id)}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{item.seller_product_code}</td>
                        <td className="p-2 max-w-[250px] truncate">{item.product_name}</td>
                        <td className="p-2 text-xs text-muted-foreground max-w-[150px] truncate">{item.option_text || "-"}</td>
                        <td className="p-2 text-right font-mono">{item.price?.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">{item.sale_price?.toLocaleString()}</td>
                        <td className="p-2">
                          <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs">
                            {item.status === "active" ? "판매중" : item.status === "soldout" ? "품절" : "판매중지"}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{item.category_name || item.category_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                <p className="text-xs text-muted-foreground">
                  총 {total}개 중 {page * limit + 1}~{Math.min((page + 1) * limit, total)}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-2">{page + 1} / {totalPages || 1}</span>
                  <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
