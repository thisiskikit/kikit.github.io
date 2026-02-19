import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { HelpTip } from "@/components/help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Clock, Loader2, UploadCloud, ImagePlus, Wand2, XCircle } from "lucide-react";

type ImageMode = "cutout" | "translate";

interface AssetImage {
  id: string;
  sourceUrl?: string | null;
  storedUrl?: string | null;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  metaJson?: Record<string, any> | null;
}

interface AssetDerivative {
  id: string;
  imageId: string;
  kind: string;
  outputUrl?: string | null;
  createdAt: string;
  paramsJson?: Record<string, any> | null;
}

interface OpsJob {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  resultJson?: Record<string, any> | null;
  errorText?: string | null;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

const statusBadge = (status: string) => {
  switch (status) {
    case "queued":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Clock className="w-3 h-3" />
          queued
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          running
        </Badge>
      );
    case "succeeded":
      return (
        <Badge variant="default" className="gap-1 text-xs">
          <CheckCircle className="w-3 h-3" />
          done
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="w-3 h-3" />
          failed
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
};

export function ImageToolPage({ mode }: { mode: ImageMode }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [targetLang, setTargetLang] = useState("ko");
  const [uploading, setUploading] = useState(false);

  const jobType = mode === "cutout" ? "IMAGE_CUTOUT" : "IMAGE_TRANSLATE";
  const title = mode === "cutout" ? "이미지 배경 제거" : "이미지 텍스트 번역";
  const description = mode === "cutout"
    ? "업로드한 이미지에서 배경을 제거하고 투명 PNG를 생성합니다."
    : "이미지 내 텍스트를 번역한 결과 이미지를 생성합니다.";

  const { data: images, isLoading: imagesLoading } = useQuery<AssetImage[]>({
    queryKey: ["/api/images/list", query],
    queryFn: async ({ queryKey }) => {
      const [, keyword] = queryKey as [string, string];
      const params = new URLSearchParams({ q: keyword || "" });
      const res = await apiRequest("GET", `/api/images/list?${params.toString()}`);
      return res.json();
    },
  });

  const selectedImage = useMemo(
    () => images?.find((img) => img.id === selectedId) || null,
    [images, selectedId],
  );

  const { data: derivatives } = useQuery<AssetDerivative[]>({
    queryKey: ["/api/images", selectedId || "none", "derivatives"],
    enabled: Boolean(selectedId),
    queryFn: async ({ queryKey }) => {
      const [, imageId] = queryKey as [string, string, string];
      const res = await apiRequest("GET", `/api/images/${imageId}/derivatives`);
      return res.json();
    },
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<OpsJob[]>({
    queryKey: ["/api/jobs", jobType],
    queryFn: async ({ queryKey }) => {
      const [, type] = queryKey as [string, string];
      const params = new URLSearchParams({ type, limit: "20" });
      const res = await apiRequest("GET", `/api/jobs?${params.toString()}`);
      return res.json();
    },
    refetchInterval: 2000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: { dataUrl?: string; sourceUrl?: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/images/upload", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images/list"] });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: async () => {
      if (!selectedImage) {
        throw new Error("이미지를 먼저 선택하세요.");
      }
      const payload = {
        imageId: selectedImage.id,
        imageUrl: selectedImage.storedUrl || selectedImage.sourceUrl,
        targetLang,
        created_by: "ui-user",
      };
      const url = mode === "cutout" ? "/api/images/cutout" : "/api/images/translate";
      const res = await apiRequest("POST", url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "요청 완료", description: "작업이 큐에 등록되었습니다." });
    },
    onError: (err: any) => {
      toast({ title: "요청 실패", description: err.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        await uploadMutation.mutateAsync({ dataUrl, name: file.name });
      }
      toast({ title: "업로드 완료", description: `${files.length}개 이미지가 등록되었습니다.` });
    } catch (err: any) {
      toast({ title: "업로드 실패", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return;
    try {
      await uploadMutation.mutateAsync({ sourceUrl: urlInput.trim(), name: urlInput.trim().split("/").pop() });
      setUrlInput("");
      toast({ title: "등록 완료", description: "URL 이미지가 추가되었습니다." });
    } catch (err: any) {
      toast({ title: "등록 실패", description: err.message, variant: "destructive" });
    }
  };

  const resolveImageUrl = (img?: AssetImage | null) => {
    if (!img) return "";
    return (img.storedUrl || img.sourceUrl || "").toString();
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={title}
        description={description}
        helpTitle={title}
        helpLines={[
          "더미 처리로 결과 이미지를 생성합니다.",
          "내일 실제 OCR/번역/배경제거 API로 교체할 수 있게 분리했습니다.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              업로드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm cursor-pointer hover:bg-accent/40 transition-colors">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} data-testid="input-image-upload" />
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {uploading ? "업로드 중..." : "클릭하여 이미지 업로드"}
              </span>
            </label>

            <div className="space-y-2">
              <Label className="text-xs">이미지 URL 추가</Label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  data-testid="input-image-url"
                />
                <Button onClick={handleUrlAdd} disabled={!urlInput.trim() || uploadMutation.isPending}>
                  추가
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">검색</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="파일명, URL, MIME"
                data-testid="input-image-search"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">이미지 라이브러리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
            {imagesLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : !images || images.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">등록된 이미지가 없습니다.</p>
            ) : (
              images.map((img) => {
                const imgUrl = resolveImageUrl(img);
                const isSelected = img.id === selectedId;
                return (
                  <button
                    key={img.id}
                    type="button"
                    className={`flex items-center gap-3 w-full rounded-md border p-2 text-left transition-colors ${
                      isSelected ? "border-primary bg-accent/40" : "hover:bg-accent/30"
                    }`}
                    onClick={() => setSelectedId(img.id)}
                    data-testid={`image-item-${img.id}`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-12 h-12 rounded border object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{imgUrl || "image"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(img.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              실행
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedImage ? (
              <p className="text-sm text-muted-foreground text-center py-8">이미지를 선택하세요.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <img
                    src={resolveImageUrl(selectedImage)}
                    alt=""
                    className="w-full h-48 rounded-md border object-contain bg-muted"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {resolveImageUrl(selectedImage)}
                  </p>
                </div>

                {mode === "translate" && (
                  <div className="space-y-1">
                    <Label className="text-xs">목표 언어</Label>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger data-testid="select-target-lang">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ko">한국어</SelectItem>
                        <SelectItem value="en">영어</SelectItem>
                        <SelectItem value="ja">일본어</SelectItem>
                        <SelectItem value="zh">중국어</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={() => runJobMutation.mutate()}
                  disabled={!selectedImage || runJobMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-run-image-job"
                >
                  {runJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {mode === "cutout" ? "배경 제거 실행" : "이미지 번역 실행"}
                  <HelpTip title="더미 처리" lines={["현재는 더미 결과를 생성합니다.", "내일 실제 API로 교체하세요."]} />
                </Button>

                <div className="space-y-2">
                  <Label className="text-xs">결과 이미지</Label>
                  {!derivatives || derivatives.length === 0 ? (
                    <p className="text-xs text-muted-foreground">아직 결과가 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {derivatives.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                          <img src={d.outputUrl || ""} alt="" className="w-12 h-12 rounded border object-cover bg-muted" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{d.kind}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{d.outputUrl}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {new Date(d.createdAt).toLocaleDateString("ko-KR")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 작업</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobsLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : !jobs || jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">작업 기록이 없습니다.</p>
          ) : (
            jobs.map((job) => {
              const outputUrl = job.resultJson?.outputUrl;
              return (
                <div key={job.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                  {statusBadge(job.status)}
                  <span className="text-xs text-muted-foreground font-mono">{job.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString("ko-KR")}</span>
                  {outputUrl && (
                    <img src={String(outputUrl)} alt="" className="w-10 h-10 rounded border object-cover bg-muted" />
                  )}
                  {job.errorText && (
                    <span className="text-xs text-red-400 truncate">{job.errorText}</span>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
