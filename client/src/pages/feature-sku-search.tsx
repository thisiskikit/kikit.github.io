import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package } from "lucide-react";
import type { SkuMaster } from "@shared/schema";

type CompositionItem = {
  name: string;
  quantity: number;
  aliases: string[];
  packHint: string | null;
  tasteHint: string | null;
  confidence: number | null;
};

type CompositionItemResult = {
  item: CompositionItem;
  queries: string[];
  matches: Array<SkuMaster & { matchScore: number }>;
};

type ComposeSearchResponse = {
  input: string;
  llm: {
    enabled: boolean;
    used: boolean;
    model: string | null;
    needsClarification: boolean;
    questions: string[];
    message?: string;
  };
  itemResults: CompositionItemResult[];
  totalMatches: number;
};

export default function FeatureSkuSearchPage() {
  const [query, setQuery] = useState("");
  const [compositionText, setCompositionText] = useState("");
  const normalizedQuery = query.trim();
  const normalizedComposition = compositionText.trim();

  const { data: results, isLoading } = useQuery<SkuMaster[]>({
    queryKey: ["/api/sku/search", normalizedQuery],
    enabled: normalizedQuery.length > 0,
    queryFn: async ({ queryKey }) => {
      const [, keyword] = queryKey as [string, string];
      const params = new URLSearchParams({ q: keyword });
      const res = await apiRequest("GET", `/api/sku/search?${params.toString()}`);
      return await res.json();
    },
  });

  const composeMutation = useMutation<ComposeSearchResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sku/compose-search", {
        text: normalizedComposition,
        limitPerItem: 8,
      });
      return await res.json();
    },
  });

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <PageHeader
        title="SKU Search"
        description="Search master SKU directly, or parse composition text and auto-match by item."
        helpTitle="SKU Search"
        helpLines={[
          "Direct search queries sku_master by SKU, product name, brand, category, and memo.",
          "Composition mode uses LLM parsing when available and falls back to rule-based parsing.",
          "Each parsed item is matched against master SKU and ranked by relevance score.",
        ]}
      />

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="text-sm font-semibold">Direct Search</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Type SKU, product name, brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

      {results && results.length === 0 && normalizedQuery.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="w-10 h-10 mb-3 opacity-30 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No SKU match for "{normalizedQuery}".</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-1">
            {results.map((sku) => (
              <div
                key={sku.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border text-sm"
                data-testid={`sku-result-${sku.sku}`}
              >
                <Badge variant="outline" className="font-mono text-xs">{sku.sku}</Badge>
                <span className="flex-1">{sku.productName}</span>
                {sku.brand && <span className="text-xs text-muted-foreground">{sku.brand}</span>}
                {sku.category && <Badge variant="secondary" className="text-xs">{sku.category}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="text-sm font-semibold">Composition to SKU Match</div>
          <Textarea
            value={compositionText}
            onChange={(e) => setCompositionText(e.target.value)}
            placeholder="Example: spicy ramen cup x2, mild udon cup x1"
            className="min-h-[96px]"
            data-testid="input-composition-search"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => composeMutation.mutate()}
              disabled={composeMutation.isPending || normalizedComposition.length === 0}
              data-testid="button-compose-search"
            >
              Analyze and Match
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCompositionText("");
                composeMutation.reset();
              }}
              data-testid="button-compose-reset"
            >
              Clear
            </Button>
          </div>

          {composeMutation.isPending && (
            <div className="space-y-2 pt-2">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          )}

          {composeMutation.isError && (
            <p className="text-sm text-destructive" data-testid="compose-error">
              {composeMutation.error.message}
            </p>
          )}

          {composeMutation.data && (
            <div className="space-y-3 pt-2" data-testid="compose-results">
              <div className="flex flex-wrap gap-2">
                <Badge variant={composeMutation.data.llm.enabled ? "default" : "outline"}>
                  LLM: {composeMutation.data.llm.enabled ? "enabled" : "disabled"}
                </Badge>
                <Badge variant={composeMutation.data.llm.used ? "default" : "secondary"}>
                  Parse: {composeMutation.data.llm.used ? "LLM" : "fallback"}
                </Badge>
                {composeMutation.data.llm.model && (
                  <Badge variant="outline">{composeMutation.data.llm.model}</Badge>
                )}
                <Badge variant="secondary">Total matches: {composeMutation.data.totalMatches}</Badge>
              </div>

              {composeMutation.data.llm.message && (
                <p className="text-xs text-muted-foreground">{composeMutation.data.llm.message}</p>
              )}

              {composeMutation.data.llm.questions.length > 0 && (
                <div className="text-xs text-amber-500 space-y-1">
                  {composeMutation.data.llm.questions.map((question, index) => (
                    <p key={`${question}-${index}`}>- {question}</p>
                  ))}
                </div>
              )}

              {composeMutation.data.itemResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No items parsed from the input.</p>
              )}

              {composeMutation.data.itemResults.map((entry, index) => (
                <Card key={`${entry.item.name}-${index}`}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{entry.item.name}</Badge>
                      <Badge variant="outline">qty {entry.item.quantity}</Badge>
                      {entry.item.packHint && <Badge variant="secondary">{entry.item.packHint}</Badge>}
                      {entry.item.tasteHint && <Badge variant="secondary">{entry.item.tasteHint}</Badge>}
                      {entry.item.confidence !== null && (
                        <Badge variant="outline">conf {entry.item.confidence.toFixed(2)}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entry.queries.map((queryTerm) => (
                        <Badge key={queryTerm} variant="outline" className="text-xs">
                          {queryTerm}
                        </Badge>
                      ))}
                    </div>
                    {entry.matches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No SKU match for this item.</p>
                    ) : (
                      <div className="space-y-1">
                        {entry.matches.map((match) => (
                          <div key={match.id} className="flex flex-wrap items-center gap-2 rounded border px-2 py-1 text-xs">
                            <Badge variant="outline" className="font-mono">{match.sku}</Badge>
                            <span className="flex-1">{match.productName}</span>
                            <Badge variant="secondary">score {match.matchScore}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
