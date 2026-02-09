import type { CoupangProduct } from "@shared/schema";

const brands = ["키킷홈", "스마트리빙", "프리미엄하우스", "에코라이프", "모던스타일", "데일리굿즈"];
const categories = [
  { id: "CAT001", name: "주방용품" },
  { id: "CAT002", name: "생활용품" },
  { id: "CAT003", name: "수납/정리" },
  { id: "CAT004", name: "욕실용품" },
  { id: "CAT005", name: "인테리어소품" },
  { id: "CAT006", name: "가전/디지털" },
];
const statuses = ["active", "active", "active", "active", "inactive", "soldout"];
const productNames = [
  "스테인리스 보온병 500ml", "실리콘 주방매트 대형", "원목 도마 항균코팅",
  "무선 충전 LED 무드등", "접이식 빨래건조대 3단", "프리미엄 극세사 수건 세트",
  "자동 센서 쓰레기통 12L", "대나무 칫솔 거치대 4구", "스테인리스 식기건조대",
  "미끄럼방지 욕실매트", "다용도 수납바구니 3종", "LED 스탠드 조명 터치식",
  "진공 밀폐용기 4종 세트", "에코 장바구니 접이식", "벽걸이 다용도 선반",
  "코드리스 핸디 청소기", "향균 도마 세트 3P", "스틸 양념통 세트 6구",
  "보냉보온 도시락 가방", "디지털 주방 저울 5kg",
  "냄비 받침대 세트", "식탁 매트 4장 세트", "스테인리스 물병 1L",
  "접이식 세탁 바구니", "원목 수저통", "멀티탭 정리함",
  "화장실 선반 2단", "주방 후크 세트 10P", "미니 가습기 USB",
  "캔들 워머 세라믹", "담요 극세사 블랭킷", "라탄 수납 바구니",
  "스마트 체중계 블루투스", "전동 칫솔 거치대", "아로마 디퓨저 200ml",
  "접이식 테이블 미니", "자석 메모보드 화이트", "양면 테이프 강력형",
  "LED 거울 터치형", "다용도 클립 세트 50P",
];
const options = ["", "화이트", "블랙", "그레이", "네이비", "베이지", "화이트/대형", "블랙/소형", "세트A", "세트B"];

export function generateMockProducts(count: number = 200): CoupangProduct[] {
  const products: CoupangProduct[] = [];
  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const basePrice = Math.floor(Math.random() * 50000) + 5000;
    const saleDiscount = Math.random() > 0.3 ? Math.floor(basePrice * (0.7 + Math.random() * 0.25)) : basePrice;
    products.push({
      product_id: `CP${String(100000 + i).padStart(8, "0")}`,
      seller_product_code: `KK-${String(i + 1).padStart(5, "0")}`,
      product_name: productNames[i % productNames.length] + (i >= productNames.length ? ` (${i})` : ""),
      option_text: options[i % options.length],
      price: basePrice,
      sale_price: saleDiscount,
      status: statuses[i % statuses.length],
      category_id: cat.id,
      category_name: cat.name,
      images_main: `https://placehold.co/400x400/333/fff?text=Product${i + 1}`,
      images_sub: "",
      brand: brands[i % brands.length],
      stock: Math.floor(Math.random() * 500) + 1,
      memo: "",
    });
  }
  return products;
}

let _mockProducts: CoupangProduct[] | null = null;

export function getMockProducts(): CoupangProduct[] {
  if (!_mockProducts) {
    _mockProducts = generateMockProducts(200);
  }
  return _mockProducts;
}

export function getMockProductById(productId: string): CoupangProduct | undefined {
  return getMockProducts().find(p => p.product_id === productId);
}
