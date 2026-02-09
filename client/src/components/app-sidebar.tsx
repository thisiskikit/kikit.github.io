import { useLocation, Link } from "wouter";
import { HelpTip } from "./help-tip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Package,
  FileEdit,
  ShieldCheck,
  Download,
  Settings,
  Box,
  FileImage,
  Globe,
  DollarSign,
  Languages,
  Scissors,
  Search,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mainMenu = [
  {
    title: "상품 목록",
    url: "/products",
    icon: Package,
    helpTitle: "상품 목록 (Products)",
    helpLines: ["쿠팡 상품을 검색/필터/선택합니다.", "BigQuery에서 조회하거나 Mock 데이터를 사용합니다."],
  },
  {
    title: "임시 수정 (Draft)",
    url: "/draft",
    icon: FileEdit,
    helpTitle: "Draft (임시 수정본)",
    helpLines: ["선택한 상품을 수정하고 변경 이력을 관리합니다.", "Draft = 원본을 건드리지 않는 임시 수정 공간입니다."],
  },
  {
    title: "검증 (Validate)",
    url: "/validate",
    icon: ShieldCheck,
    helpTitle: "검증 (Validation)",
    helpLines: ["수정한 데이터의 오류를 검사합니다.", "Validation = 데이터가 규칙에 맞는지 확인하는 과정입니다."],
  },
  {
    title: "내보내기 (Export)",
    url: "/export",
    icon: Download,
    helpTitle: "Export (엑셀로 뽑기)",
    helpLines: ["검증 통과 후 엑셀 파일을 생성합니다.", "Export = 데이터를 외부 파일로 내보내는 것입니다."],
  },
  {
    title: "설정",
    url: "/settings",
    icon: Settings,
    helpTitle: "설정 (Settings)",
    helpLines: ["데이터소스 연결 상태와 검증 룰을 관리합니다."],
  },
];

const toolsMenu = [
  {
    title: "박스 패킹",
    url: "/tools/box-packing",
    icon: Box,
    helpTitle: "스마트 박스 패킹",
    helpLines: ["상품을 박스에 최적 배치하는 도구입니다.", "결과를 PNG로 다운로드할 수 있습니다."],
  },
  {
    title: "상세페이지 빌더",
    url: "/tools/detail-builder",
    icon: FileImage,
    helpTitle: "상세페이지 빌더",
    helpLines: ["블록을 조합하여 상품 상세페이지를 만듭니다.", "HTML로 다운로드하여 쿠팡에 등록할 수 있습니다."],
  },
];

const futureMenu = [
  {
    title: "URL 크롤링",
    url: "/features/crawler",
    icon: Globe,
    helpTitle: "크롤링 (Crawling)",
    helpLines: ["경쟁사 상품 URL에서 정보를 자동 수집합니다.", "Crawling = 웹에서 데이터를 자동으로 가져오는 것입니다."],
    locked: true,
  },
  {
    title: "가격 수정 / 품절",
    url: "/features/price-editor",
    icon: DollarSign,
    helpTitle: "가격 자동 수정",
    helpLines: ["셀러센터에서 가격/품절을 자동 처리합니다."],
    locked: true,
  },
  {
    title: "이미지 번역",
    url: "/features/image-translate",
    icon: Languages,
    helpTitle: "이미지 번역 (Image Translate)",
    helpLines: ["이미지 내 외국어를 한국어로 번역합니다."],
    locked: true,
  },
  {
    title: "누끼 / 배경제거",
    url: "/features/image-cutout",
    icon: Scissors,
    helpTitle: "누끼 (Image Cutout)",
    helpLines: ["AI로 상품 배경을 제거합니다.", "Cutout = 배경을 잘라내고 상품만 남기는 것입니다."],
    locked: true,
  },
  {
    title: "SKU 검색",
    url: "/features/sku-search",
    icon: Search,
    helpTitle: "SKU 검색",
    helpLines: ["마스터 SKU 데이터를 검색합니다.", "SKU = 재고관리 단위(Stock Keeping Unit)입니다."],
    locked: false,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const renderItem = (item: any) => {
    const isActive = location === item.url || location.startsWith(item.url + "/");
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild data-active={isActive}>
          <Link href={item.url} className="flex items-center gap-2">
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
            <span className="flex items-center gap-1 shrink-0">
              {item.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
              <HelpTip title={item.helpTitle} lines={item.helpLines} side="right" />
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">KIKIT</h2>
            <p className="text-xs text-muted-foreground leading-tight">업로드 / 상품 수정 도우미</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            핵심 기능
            <HelpTip title="핵심 기능 (P0)" lines={["현재 활성화된 주요 기능들입니다.", "상품 조회 → Draft → 검증 → Export 순서로 사용합니다."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenu.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            도구
            <HelpTip title="도구 (Tools)" lines={["포장/상세페이지 등 부가 도구입니다."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsMenu.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            확장 기능
            <HelpTip title="확장 기능 (Future)" lines={["준비중인 기능들입니다.", "Job/Runner 구조로 백그라운드 처리됩니다.", "잠금 표시(🔒)는 아직 구현되지 않았음을 의미합니다."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {futureMenu.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground text-center">KIKIT v0.1 초안</p>
      </SidebarFooter>
    </Sidebar>
  );
}
