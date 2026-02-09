import { StubPage } from "@/components/stub-page";

export default function FeatureImageTranslatePage() {
  return (
    <StubPage
      title="이미지 번역 (한글화)"
      description="외국어가 포함된 상품 이미지를 한국어로 번역하여 새 이미지를 생성합니다."
      jobType="IMAGE_TRANSLATE"
      helpTitle="이미지 번역(Image Translate)"
      helpLines={[
        "이미지 내 외국어 텍스트를 OCR로 인식합니다.",
        "인식된 텍스트를 한국어로 번역 후 이미지에 합성합니다.",
        "AI/OCR API와 이미지 편집 라이브러리가 필요합니다.",
      ]}
      whyJobRunner="이미지 처리는 OCR → 번역 → 합성의 여러 단계를 거치며 각 단계에서 외부 API를 호출합니다. 처리 시간이 길고 실패 가능성이 있어 Job 큐 기반 비동기 처리가 필수입니다."
    />
  );
}
