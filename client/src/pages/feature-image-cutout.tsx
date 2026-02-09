import { StubPage } from "@/components/stub-page";

export default function FeatureImageCutoutPage() {
  return (
    <StubPage
      title="누끼 / 배경 제거"
      description="상품 이미지에서 배경을 제거하고 깔끔한 누끼 이미지를 생성합니다."
      jobType="IMAGE_CUTOUT"
      helpTitle="누끼(Image Cutout)"
      helpLines={[
        "AI 기반 배경 제거로 상품만 깔끔하게 추출합니다.",
        "지정 영역만 잘라내기도 가능합니다.",
        "결과 이미지는 asset_derivative에 저장됩니다.",
      ]}
      whyJobRunner="AI 기반 이미지 처리는 GPU 리소스가 필요하고 처리 시간이 수 초~수십 초 소요됩니다. 대량 처리 시 Job 큐에 등록하여 순차적으로 처리해야 서버 부하를 관리할 수 있습니다."
    />
  );
}
