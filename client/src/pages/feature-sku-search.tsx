import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package } from "lucide-react";
import type { SkuMaster } from "@shared/schema";

export default function FeatureSkuSearchPage() {
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useQuery<SkuMaster[]>({
    queryKey: ["/api/sku/search", `?q=${encodeURIComponent(query)}`],
    enabled: query.length >= 1,
  });

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title="SKU 검색"
        description="마스터 SKU 데이터에서 상품 코드나 이름으로 검색합니다."
        helpTitle="SKU 검색"
        helpLines={[
          "내부 마스터 SKU 데이터베이스를 검색합니다.",
          "SKU 코드, 상품명, 브랜드 등으로 검색 가능합니다.",
          "Postgres sku_master 테이블에서 조회합니다.",
        ]}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="SKU 코드, 상품명, 브랜드로 검색..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
              data-testid="input-sku-search"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {results && results.length === 0 && query.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="w-10 h-10 mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">"{query}"에 해당하는 SKU가 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-1">
            {results.map(sku => (
              <div key={sku.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border text-sm" data-testid={`sku-result-${sku.sku}`}>
                <Badge variant="outline" className="font-mono text-xs">{sku.sku}</Badge>
                <span className="flex-1">{sku.productName}</span>
                {sku.brand && <span className="text-xs text-muted-foreground">{sku.brand}</span>}
                {sku.category && <Badge variant="secondary" className="text-xs">{sku.category}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
