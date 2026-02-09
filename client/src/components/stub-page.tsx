import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTip } from "./help-tip";
import { Lock, Play, Clock, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface StubPageProps {
  title: string;
  description: string;
  jobType: string;
  helpTitle: string;
  helpLines: string[];
  whyJobRunner: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "queued": return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    case "running": return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
    case "succeeded": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    default: return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  }
}

export function StubPage({ title, description, jobType, helpTitle, helpLines, whyJobRunner }: StubPageProps) {
  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs", `?type=${jobType}&limit=20`],
    refetchInterval: 5000,
  });

  const createJob = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobs", {
        type: jobType,
        payload: { dryRun: true, sample: true },
        created_by: "ui-user",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <HelpTip title={helpTitle} lines={helpLines} />
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Lock className="w-3 h-3" />
          준비중
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">왜 Job/Runner가 필요한가요?</p>
                <p className="text-sm text-muted-foreground">{whyJobRunner}</p>
              </div>
            </div>
            <Button
              onClick={() => createJob.mutate()}
              disabled={createJob.isPending}
              className="gap-2"
              data-testid="button-create-sample-job"
            >
              {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              샘플 Job 생성 (드라이런)
              <HelpTip
                title="드라이런(Dry Run)"
                lines={[
                  "실제 작업을 수행하지 않고 Job만 생성합니다.",
                  "작업 큐에 queued 상태로 등록됩니다.",
                  "추후 Runner가 구현되면 자동 실행됩니다.",
                ]}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">최근 작업 목록</CardTitle>
          <HelpTip
            title="작업 큐(Job Queue)"
            lines={[
              "백그라운드에서 실행되는 작업 목록입니다.",
              "상태: queued(대기) → running(실행중) → succeeded(성공)/failed(실패)",
            ]}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 생성된 작업이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border text-sm">
                  <span className="flex items-center gap-1.5">
                    {statusIcon(job.status)}
                    <span className="font-mono text-xs">{job.status}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(job.createdAt).toLocaleString("ko-KR")}
                  </span>
                  {job.errorText && (
                    <span className="text-xs text-red-400 truncate max-w-[300px]">{job.errorText}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
