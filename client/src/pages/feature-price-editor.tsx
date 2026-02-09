import { StubPage } from "@/components/stub-page";

export default function FeaturePriceEditorPage() {
  return (
    <StubPage
      title="가격 수정 / 품절 처리"
      description="크롬 자동화를 통해 쿠팡 셀러센터에서 가격 수정 및 품절 처리를 대량으로 수행합니다."
      jobType="EDIT_PRICE"
      helpTitle="가격 수정(Price Edit)"
      helpLines={[
        "셀러센터에 자동 로그인하여 가격을 변경합니다.",
        "품절 처리도 동일한 방식으로 자동화됩니다.",
        "크롬 자동화(Selenium/Puppeteer) Runner가 필요합니다.",
      ]}
      whyJobRunner="셀러센터 자동화는 브라우저를 통해 실행되므로 시간이 걸리고, 인증/세션 관리가 필요합니다. Job 큐에 등록 후 Runner 서버에서 순차 처리하는 구조가 안전합니다."
    />
  );
}
