import { StubPage } from "@/components/stub-page";

export default function FeatureCrawlerPage() {
  return (
    <StubPage
      title="URL 크롤링"
      description="경쟁사 상품 URL을 크롤링하여 템플릿으로 저장하는 기능입니다."
      jobType="CRAWL_URL"
      helpTitle="크롤링(Crawling)"
      helpLines={[
        "지정한 URL의 상품 정보를 자동으로 수집합니다.",
        "수집된 데이터는 우리 양식 템플릿에 맞게 정규화됩니다.",
        "백그라운드 Job으로 실행되며, Runner가 필요합니다.",
      ]}
      whyJobRunner="크롤링은 외부 사이트에 접속하여 데이터를 가져오는 작업입니다. 시간이 오래 걸릴 수 있고 실패 시 재시도가 필요하므로, 백그라운드 Job/Runner 구조로 안정적으로 처리해야 합니다."
    />
  );
}
