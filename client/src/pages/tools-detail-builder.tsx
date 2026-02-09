import { useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import {
  Download,
  Layout,
  Palette,
  Type,
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  Trash2,
  Plus,
  Copy,
  GripVertical,
} from "lucide-react";

const getProxyUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=80`;
};

interface TemplateColors {
  primary: string;
  background: string;
  text: string;
  accent: string;
}

interface TemplateOptions {
  font: string;
  align: string;
  spacing: string;
  badgeStyle: string;
}

interface IntroSection {
  visible: boolean;
  image: string;
  text: string;
}

interface ChecklistSection {
  visible: boolean;
  type: string;
  title: string;
  items: string[];
}

interface ImagePointSection {
  visible: boolean;
  type: string;
  layout: string;
  title: string;
  desc: string;
  image: string;
}

interface StatsSection {
  visible: boolean;
  type: string;
  title: string;
  stats: { label: string; value: string }[];
}

interface MoreImagesSection {
  visible: boolean;
  images: string[];
}

interface InfoSection {
  visible: boolean;
  content: string;
}

interface TemplateSections {
  intro: IntroSection;
  point1: ChecklistSection;
  point2: ImagePointSection;
  point3: ImagePointSection;
  point4: StatsSection;
  moreImages: MoreImagesSection;
  info: InfoSection;
  [key: string]: { visible: boolean } & Record<string, any>;
}

interface TemplateData {
  brand: string;
  productName: string;
  catchphrase: string;
  colors: TemplateColors;
  options: TemplateOptions;
  sections: TemplateSections;
}

interface Template {
  label: string;
  icon: string;
  data: TemplateData;
}

const TEMPLATES: Record<string, Template> = {
  cosmetic: {
    label: "뷰티/화장품",
    icon: "✨",
    data: {
      brand: "PURE & CLEAN",
      productName: "히알루론산 수분 진정 토너",
      catchphrase: "속건조를 잡는 3초의 기적\n피부 깊숙이 차오르는 수분광",
      colors: { primary: "#436750", background: "#ffffff", text: "#1a1a1a", accent: "#E8F5E9" },
      options: { font: "sans", align: "center", spacing: "normal", badgeStyle: "rounded" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1000&auto=format&fit=crop", text: "자연에서 찾은\n가장 순수한 진정" },
        point1: { visible: true, type: "check", title: "아무리 발라도 건조한가요?", items: ["세안 후 3초 만에 당기는 피부", "겉은 번들거리고 속은 마르는 수부지", "예민해서 아무거나 바를 수 없는 피부"] },
        point2: { visible: true, type: "image", layout: "normal", title: "Point 01. 10중 히알루론산", desc: "분자 크기가 다른 10가지 히알루론산이\n피부 층층이 수분을 채워줍니다.", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "normal", title: "Point 02. 끈적임 없는 워터 제형", desc: "물처럼 가볕게 스며들어\n산묻한 마무리감을 선사합니다.", image: "https://images.unsplash.com/photo-1556228720-197793570634?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "검증된 효과, 믿을 수 있는 수치", stats: [{ label: "수분 개선율", value: "148%" }, { label: "피부 자극도", value: "0.00" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "제품명: 수분 진정 토너 | 용량: 200ml | 제조국: 대한민국" },
      },
    },
  },
  figure: {
    label: "피규어/굿즈",
    icon: "🤖",
    data: {
      brand: "COLLECTOR'S JOY",
      productName: "1/6 스케일 드래곤 슬레이어",
      catchphrase: "전설적인 디테일의 귀환\n압도적인 존재감을 소장하세요",
      colors: { primary: "#374151", background: "#F3F4F6", text: "#111827", accent: "#E5E7EB" },
      options: { font: "sans", align: "left", spacing: "wide", badgeStyle: "square" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?q=80&w=1000&auto=format&fit=crop", text: "어둠 속에서도 빛나는\n궁극의 조형미" },
        point1: { visible: true, type: "check", title: "수집가들이 열광하는 이유", items: ["원작을 완벽하게 재현한 헤드 조형", "자유로운 포징이 가능한 32개 관절", "리얼한 웨더링 도색 마감"] },
        point2: { visible: true, type: "image", layout: "full", title: "Detail 01. 숨막히는 헤드 퀄리티", desc: "피부 질감부터 눈동자의 광채까지,\n장인의 손길로 완성된 리얼리즘을 경험하세요.", image: "https://images.unsplash.com/photo-1614285997237-dbad57088918?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "full", title: "Detail 02. 풍성한 루즈 구성", desc: "다양한 손 파츠와 무기 세트가 포함되어\n다이내믹한 연출이 가능합니다.", image: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "제품 상세 스펙", stats: [{ label: "크기 (높이)", value: "32cm" }, { label: "소재", value: "PVC/ABS" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "제품명: 드래곤 슬레이어 | 사용연령: 15세 이상 | 제조국: 중국 OEM" },
      },
    },
  },
  food: {
    label: "식품/건강",
    icon: "🥗",
    data: {
      brand: "FRESH TABLE",
      productName: "프리미엄 생 아보카도",
      catchphrase: "숲속의 버터, 식탁 위의 건강\n가장 신선할 때 만나보세요",
      colors: { primary: "#65a30d", background: "#ffffff", text: "#1a1a1a", accent: "#ecfccb" },
      options: { font: "serif", align: "center", spacing: "normal", badgeStyle: "rounded" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1523049673856-42848f5d1b23?q=80&w=1000&auto=format&fit=crop", text: "매일 아침 만나는\n신선한 초록 에너지" },
        point1: { visible: true, type: "check", title: "이런 분들께 추천해요", items: ["간편하고 건강한 아침을 찾는 분", "다이어트 식단 관리가 필요하신 분", "첨가물 없는 순수 자연식을 원하시는 분"] },
        point2: { visible: true, type: "image", layout: "normal", title: "Taste. 크리미한 풍미", desc: "입안 가득 퍼지는 고소함과 부드러움,\n어떤 요리와도 완벽한 조화를 이룹니다.", image: "https://images.unsplash.com/photo-1601039641847-7857b994d704?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "normal", title: "Fresh. 산지 직송 시스템", desc: "가장 맛있는 후숙 단계에서 수확하여\n당신의 식탁까지 빠르게 배송합니다.", image: "https://images.unsplash.com/photo-1615486511484-92e5724d1c12?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "영양 정보 (100g당)", stats: [{ label: "칼로리", value: "160kcal" }, { label: "식이섬유", value: "7g" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "제품명: 생 아보카도 | 원산지: 멕시코 | 보관방법: 서늘한 곳에 보관" },
      },
    },
  },
};

const SectionBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-gray-100 pb-6 mb-6 last:border-0">
    <h4 className="font-bold text-sm text-gray-700 mb-4">{title}</h4>
    <div className="space-y-4">{children}</div>
  </div>
);

const LocalInput = ({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
    />
  </div>
);

const LocalTextArea = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-colors"
    />
  </div>
);

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 p-1.5 text-xs border border-gray-300 rounded"
      />
    </div>
  </div>
);

const GuidePanel = ({ currentTemplate }: { currentTemplate: string }) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
      <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" /> AI 기획 프롬프트
      </h3>
      <p className="text-sm text-blue-700 mb-3">
        상품에 맞춰 아래 프롬프트를 복사하여 AI(ChatGPT 등)에게 물어보세요.
      </p>
      <div className="bg-white p-3 rounded border border-blue-200 text-xs text-gray-600 font-mono relative">
        "{TEMPLATES[currentTemplate].label} 상세페이지를 만들려고 해. [상품명]을 팔기 위한 논리 구조(인트로-후킹-특장점1-특장점2-신뢰)를 짜주고, 각 섹션에 들어갈 매력적인 카피라이팅을 작성해줘."
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(
              `"${TEMPLATES[currentTemplate].label} 상세페이지를 만들려고 해. [상품명]을 팔기 위한 논리 구조(인트로-후킹-특장점1-특장점2-신뢰)를 짜주고, 각 섹션에 들어갈 매력적인 카피라이팅을 작성해줘."`
            )
          }
          className="absolute top-2 right-2 p-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          data-testid="button-copy-prompt"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
);

const SettingsPanel = ({
  data,
  toggleSection,
  updateOption,
}: {
  data: TemplateData;
  toggleSection: (s: string) => void;
  updateOption: (k: string, v: string) => void;
}) => (
  <div className="space-y-6">
    <SectionBlock title="1. 레이아웃 & 스타일">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">텍스트 정렬</label>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              type="button"
              onClick={() => updateOption("align", "left")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.align === "left" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-align-left"
            >
              <AlignLeft className="w-3 h-3" /> 왼쪽 정렬
            </button>
            <button
              type="button"
              onClick={() => updateOption("align", "center")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.align === "center" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-align-center"
            >
              <AlignCenter className="w-3 h-3" /> 가운데 정렬
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">폰트 스타일</label>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              type="button"
              onClick={() => updateOption("font", "sans")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.font === "sans" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-font-sans"
            >
              <Type className="w-3 h-3" /> 고딕 (깔끔)
            </button>
            <button
              type="button"
              onClick={() => updateOption("font", "serif")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.font === "serif" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-font-serif"
            >
              <Type className="w-3 h-3" /> 명조 (감성)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">섹션 간격 (여백)</label>
          <div className="flex bg-gray-100 rounded p-1">
            {(["compact", "normal", "wide"] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => updateOption("spacing", opt)}
                className={`flex-1 py-1 text-xs rounded capitalize transition-all ${data.options.spacing === opt ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
                data-testid={`button-spacing-${opt}`}
              >
                {opt === "compact" ? "좁게" : opt === "normal" ? "보통" : "넓게"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="2. 섹션 표시 (ON/OFF)">
      <div className="space-y-2">
        {[
          { id: "intro", label: "인트로 (타이틀)" },
          { id: "point1", label: "체크리스트 (문제제기)" },
          { id: "point2", label: "포인트 01 (특장점)" },
          { id: "point3", label: "포인트 02 (디테일)" },
          { id: "point4", label: "스펙/검증 (신뢰)" },
          { id: "moreImages", label: "상세 이미지 추가 (자유)" },
          { id: "info", label: "하단 정보 고시" },
        ].map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between gap-2 p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">{section.label}</span>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={`p-1.5 rounded-full transition-colors ${data.sections[section.id]?.visible ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-400"}`}
              data-testid={`button-toggle-${section.id}`}
            >
              {data.sections[section.id]?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </SectionBlock>
  </div>
);

const EditPanel = ({
  data,
  setData,
  updateSection,
  addChecklistItem,
  removeChecklistItem,
  addStatItem,
  removeStatItem,
  addMoreImage,
  updateMoreImage,
  removeMoreImage,
}: {
  data: TemplateData;
  setData: React.Dispatch<React.SetStateAction<TemplateData>>;
  updateSection: (section: string, key: string, value: any) => void;
  addChecklistItem: () => void;
  removeChecklistItem: (idx: number) => void;
  addStatItem: () => void;
  removeStatItem: (idx: number) => void;
  addMoreImage: () => void;
  updateMoreImage: (idx: number, val: string) => void;
  removeMoreImage: (idx: number) => void;
}) => (
  <div className="space-y-6">
    <SectionBlock title="기본 정보">
      <LocalInput label="브랜드명" value={data.brand} onChange={(v) => setData((prev) => ({ ...prev, brand: v }))} />
      <LocalInput label="상품명" value={data.productName} onChange={(v) => setData((prev) => ({ ...prev, productName: v }))} />
      <LocalTextArea label="메인 카피" value={data.catchphrase} onChange={(v) => setData((prev) => ({ ...prev, catchphrase: v }))} />
    </SectionBlock>

    {data.sections.intro.visible && (
      <SectionBlock title="인트로">
        <LocalInput label="이미지 URL" value={data.sections.intro.image} onChange={(v) => updateSection("intro", "image", v)} />
        <LocalTextArea label="문구" value={data.sections.intro.text} onChange={(v) => updateSection("intro", "text", v)} />
      </SectionBlock>
    )}

    {data.sections.point1.visible && (
      <SectionBlock title="체크리스트 (항목 추가/삭제)">
        <LocalInput label="제목" value={data.sections.point1.title} onChange={(v) => updateSection("point1", "title", v)} />
        {data.sections.point1.items.map((item, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <LocalInput
              value={item}
              onChange={(v) => {
                const newItems = [...data.sections.point1.items];
                newItems[idx] = v;
                updateSection("point1", "items", newItems);
              }}
            />
            <button type="button" onClick={() => removeChecklistItem(idx)} className="text-gray-400 hover:text-red-500 p-1" data-testid={`button-remove-check-${idx}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addChecklistItem}
          className="w-full py-2 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 rounded flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors"
          data-testid="button-add-checklist"
        >
          <Plus className="w-3 h-3" /> 항목 추가
        </button>
      </SectionBlock>
    )}

    {data.sections.point2.visible && (
      <SectionBlock title="포인트 01">
        <LocalInput label="제목" value={data.sections.point2.title} onChange={(v) => updateSection("point2", "title", v)} />
        <LocalInput label="이미지 URL" value={data.sections.point2.image} onChange={(v) => updateSection("point2", "image", v)} />
        <LocalTextArea label="설명" value={data.sections.point2.desc} onChange={(v) => updateSection("point2", "desc", v)} />
      </SectionBlock>
    )}

    {data.sections.point3.visible && (
      <SectionBlock title="포인트 02">
        <LocalInput label="제목" value={data.sections.point3.title} onChange={(v) => updateSection("point3", "title", v)} />
        <LocalInput label="이미지 URL" value={data.sections.point3.image} onChange={(v) => updateSection("point3", "image", v)} />
        <LocalTextArea label="설명" value={data.sections.point3.desc} onChange={(v) => updateSection("point3", "desc", v)} />
      </SectionBlock>
    )}

    {data.sections.point4.visible && (
      <SectionBlock title="스펙/검증 (항목 추가/삭제)">
        <LocalInput label="제목" value={data.sections.point4.title} onChange={(v) => updateSection("point4", "title", v)} />
        {data.sections.point4.stats.map((stat, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <div className="flex-1">
              <LocalInput
                placeholder="항목명"
                value={stat.label}
                onChange={(v) => {
                  const newStats = [...data.sections.point4.stats];
                  newStats[idx] = { ...newStats[idx], label: v };
                  updateSection("point4", "stats", newStats);
                }}
              />
            </div>
            <div className="flex-1">
              <LocalInput
                placeholder="값"
                value={stat.value}
                onChange={(v) => {
                  const newStats = [...data.sections.point4.stats];
                  newStats[idx] = { ...newStats[idx], value: v };
                  updateSection("point4", "stats", newStats);
                }}
              />
            </div>
            <button type="button" onClick={() => removeStatItem(idx)} className="text-gray-400 hover:text-red-500 p-1" data-testid={`button-remove-stat-${idx}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addStatItem}
          className="w-full py-2 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 rounded flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors"
          data-testid="button-add-stat"
        >
          <Plus className="w-3 h-3" /> 스펙 추가
        </button>
      </SectionBlock>
    )}

    {data.sections.moreImages?.visible && (
      <SectionBlock title="8. 상세 이미지 추가 (자유)">
        <p className="text-xs text-gray-500 mb-3">배너, 디테일컷 등 원하는 만큼 이미지를 추가하세요.</p>
        {(data.sections.moreImages.images || []).map((url, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <div className="text-xs text-gray-400 w-4 text-center">{idx + 1}</div>
            <LocalInput placeholder="이미지 URL 입력 (https://...)" value={url} onChange={(v) => updateMoreImage(idx, v)} />
            <button type="button" onClick={() => removeMoreImage(idx)} className="text-gray-400 hover:text-red-500 p-1" data-testid={`button-remove-image-${idx}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addMoreImage}
          className="w-full py-3 text-sm text-blue-600 border border-blue-200 bg-blue-50 rounded flex items-center justify-center gap-1 hover:bg-blue-100 font-bold transition-colors"
          data-testid="button-add-more-image"
        >
          <Plus className="w-4 h-4" /> 이미지 추가하기
        </button>
      </SectionBlock>
    )}

    {data.sections.info.visible && (
      <SectionBlock title="하단 정보">
        <LocalTextArea label="고시 정보" value={data.sections.info.content} onChange={(v) => updateSection("info", "content", v)} />
      </SectionBlock>
    )}
  </div>
);

const DesignPanel = ({
  data,
  setData,
  updateOption,
}: {
  data: TemplateData;
  setData: React.Dispatch<React.SetStateAction<TemplateData>>;
  updateOption: (k: string, v: string) => void;
}) => (
  <div className="space-y-6">
    <SectionBlock title="컬러 테마">
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="메인 컬러 (브랜드)" value={data.colors.primary} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, primary: v } }))} />
        <ColorPicker label="배경 컬러" value={data.colors.background} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, background: v } }))} />
        <ColorPicker label="텍스트 컬러" value={data.colors.text} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, text: v } }))} />
        <ColorPicker label="강조(박스) 컬러" value={data.colors.accent} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, accent: v } }))} />
      </div>
    </SectionBlock>
    <SectionBlock title="배지 스타일">
      <div className="flex bg-gray-100 rounded p-1">
        <button
          type="button"
          onClick={() => updateOption("badgeStyle", "rounded")}
          className={`flex-1 py-1 text-xs rounded transition-all ${data.options.badgeStyle === "rounded" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
          data-testid="button-badge-rounded"
        >
          둥근형
        </button>
        <button
          type="button"
          onClick={() => updateOption("badgeStyle", "square")}
          className={`flex-1 py-1 text-xs rounded transition-all ${data.options.badgeStyle === "square" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
          data-testid="button-badge-square"
        >
          사각형
        </button>
      </div>
    </SectionBlock>
  </div>
);

export default function DetailBuilderPage() {
  const [activeTab, setActiveTab] = useState("edit");
  const [currentTemplate, setCurrentTemplate] = useState("cosmetic");
  const [data, setData] = useState<TemplateData>(TEMPLATES.cosmetic.data);
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const changeTemplate = (key: string) => {
    if (confirm("템플릿을 변경하면 현재 작성 중인 내용이 초기화됩니다. 변경하시겠습니까?")) {
      setCurrentTemplate(key);
      setData(TEMPLATES[key].data);
    }
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: data.colors.background,
        logging: false,
        onclone: (clonedDoc: Document) => {
          const clonedElement = clonedDoc.getElementById("preview-container");
          if (clonedElement) {
            clonedElement.style.transform = "none";
            clonedElement.style.boxShadow = "none";
          }
        },
      });
      const link = document.createElement("a");
      link.download = `${data.brand}_상세페이지.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("이미지 저장 실패. 외부 이미지 URL을 확인해주세요.");
    } finally {
      setIsExporting(false);
    }
  };

  const updateSection = (section: string, key: string, value: any) => {
    setData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [key]: value,
        },
      },
    }));
  };

  const toggleSection = (section: string) => {
    setData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          visible: !prev.sections[section].visible,
        },
      },
    }));
  };

  const updateOption = (key: string, value: string) => {
    setData((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value,
      },
    }));
  };

  const addChecklistItem = () => {
    const newItems = [...data.sections.point1.items, "새로운 체크리스트 항목"];
    updateSection("point1", "items", newItems);
  };
  const removeChecklistItem = (idx: number) => {
    const newItems = data.sections.point1.items.filter((_: string, i: number) => i !== idx);
    updateSection("point1", "items", newItems);
  };
  const addStatItem = () => {
    const newStats = [...data.sections.point4.stats, { label: "새 항목", value: "00%" }];
    updateSection("point4", "stats", newStats);
  };
  const removeStatItem = (idx: number) => {
    const newStats = data.sections.point4.stats.filter((_: any, i: number) => i !== idx);
    updateSection("point4", "stats", newStats);
  };
  const addMoreImage = () => {
    const currentImages = data.sections.moreImages?.images || [];
    const newImages = [...currentImages, ""];
    updateSection("moreImages", "images", newImages);
  };
  const updateMoreImage = (idx: number, val: string) => {
    const currentImages = [...(data.sections.moreImages?.images || [])];
    currentImages[idx] = val;
    updateSection("moreImages", "images", currentImages);
  };
  const removeMoreImage = (idx: number) => {
    const currentImages = (data.sections.moreImages?.images || []).filter((_: string, i: number) => i !== idx);
    updateSection("moreImages", "images", currentImages);
  };

  const getFontFamily = () => {
    if (data.options.font === "serif") return '"Noto Serif KR", serif';
    return '"Noto Sans KR", sans-serif';
  };
  const getSpacingClass = () => {
    if (data.options.spacing === "compact") return "py-8";
    if (data.options.spacing === "wide") return "py-24";
    return "py-16";
  };
  const getBadgeClass = () => {
    if (data.options.badgeStyle === "square") return "rounded-none";
    return "rounded-full";
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-white font-sans text-gray-900 overflow-hidden">
      <div className="w-full md:w-1/3 lg:w-96 bg-gray-50 border-r border-gray-200 h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2" data-testid="text-detail-builder-title">
            <Layout className="w-5 h-5 text-indigo-600" />
            상세페이지 빌더
          </h1>
          <div className="flex gap-2 mt-3">
            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
              <button
                type="button"
                key={key}
                onClick={() => key !== currentTemplate && changeTemplate(key)}
                className={`flex-1 py-1.5 px-2 text-xs rounded border transition-all flex items-center justify-center gap-1
                  ${
                    currentTemplate === key
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                data-testid={`button-template-${key}`}
              >
                <span>{tmpl.icon}</span> {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border-b border-gray-200 bg-white">
          {[
            { id: "edit", label: "1. 내용 편집", icon: Type },
            { id: "settings", label: "2. 설정/구조", icon: Settings },
            { id: "design", label: "3. 디자인", icon: Palette },
            { id: "guide", label: "4. 기획 가이드", icon: HelpCircle },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors
                ${activeTab === tab.id ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50" : "text-gray-500 hover:text-gray-700"}`}
              data-testid={`button-tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === "guide" && <GuidePanel currentTemplate={currentTemplate} />}
          {activeTab === "settings" && <SettingsPanel data={data} toggleSection={toggleSection} updateOption={updateOption} />}
          {activeTab === "edit" && (
            <EditPanel
              data={data}
              setData={setData}
              updateSection={updateSection}
              addChecklistItem={addChecklistItem}
              removeChecklistItem={removeChecklistItem}
              addStatItem={addStatItem}
              removeStatItem={removeStatItem}
              addMoreImage={addMoreImage}
              updateMoreImage={updateMoreImage}
              removeMoreImage={removeMoreImage}
            />
          )}
          {activeTab === "design" && <DesignPanel data={data} setData={setData} updateOption={updateOption} />}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            data-testid="button-export-jpg"
          >
            {isExporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? "생성 중..." : "통이미지 저장 (JPG)"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-200 p-4 lg:p-8 overflow-y-auto flex justify-center items-start">
        <div
          id="preview-container"
          ref={previewRef}
          className="w-[480px] min-h-[1000px] bg-white shadow-2xl origin-top transition-all duration-300"
          style={{
            backgroundColor: data.colors.background,
            color: data.colors.text,
            fontFamily: getFontFamily(),
          }}
          data-testid="preview-container"
        >
          {data.sections.intro.visible && (
            <div className="relative">
              <div className={`absolute top-8 left-0 right-0 z-10 px-6 ${data.options.align === "center" ? "text-center" : "text-left"}`}>
                <p
                  className="text-sm font-bold tracking-[0.2em] mb-2 uppercase opacity-90"
                  style={{ color: data.colors.background === "#ffffff" ? "#fff" : data.colors.primary }}
                >
                  {data.brand}
                </p>
                <h1
                  className="text-3xl font-bold leading-tight drop-shadow-md whitespace-pre-wrap"
                  style={{ color: data.colors.background === "#ffffff" ? "#fff" : data.colors.text }}
                >
                  {data.sections.intro.text}
                </h1>
              </div>
              <img src={getProxyUrl(data.sections.intro.image)} alt="Intro" className="w-full h-[500px] object-cover" crossOrigin="anonymous" />
              <div
                className={`p-8 bg-white ${data.options.align === "center" ? "text-center" : "text-left"}`}
                style={{ backgroundColor: data.colors.background }}
              >
                <h2 className="text-2xl font-bold mb-4" style={{ color: data.colors.primary }}>
                  {data.productName}
                </h2>
                <p className="text-lg leading-relaxed whitespace-pre-wrap opacity-80">{data.catchphrase}</p>
              </div>
            </div>
          )}

          {data.sections.point1.visible && (
            <div className={`${getSpacingClass()} px-6`} style={{ backgroundColor: data.colors.accent }}>
              <h3 className={`text-xl font-bold mb-8 ${data.options.align === "center" ? "text-center" : "text-left"}`}>{data.sections.point1.title}</h3>
              <div className="space-y-4">
                {data.sections.point1.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/80 p-4 rounded-lg shadow-sm">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: data.colors.primary }} />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.sections.point2.visible && (
            <div className={`${getSpacingClass()} px-6 ${data.options.align === "center" ? "text-center" : "text-left"}`}>
              <span className={`inline-block px-3 py-1 text-xs font-bold border border-current mb-4 ${getBadgeClass()}`} style={{ color: data.colors.primary }}>
                POINT 01
              </span>
              <h3 className="text-2xl font-bold mb-6">{data.sections.point2.title}</h3>
              <img
                src={getProxyUrl(data.sections.point2.image)}
                alt="Point 1"
                className="w-full h-[400px] object-cover rounded-2xl mb-6 shadow-md"
                crossOrigin="anonymous"
              />
              <p className="text-lg leading-relaxed whitespace-pre-wrap opacity-80">{data.sections.point2.desc}</p>
            </div>
          )}

          {data.sections.point3.visible && (
            <div className={`${getSpacingClass()} px-6 relative overflow-hidden ${data.options.align === "center" ? "text-center" : "text-left"}`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundColor: data.colors.primary }}></div>
              <div className="relative z-10">
                <span
                  className={`inline-block px-3 py-1 text-xs font-bold border border-current mb-4 ${getBadgeClass()}`}
                  style={{ color: data.colors.primary }}
                >
                  POINT 02
                </span>
                <h3 className="text-2xl font-bold mb-6">{data.sections.point3.title}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <img
                      src={getProxyUrl(data.sections.point3.image)}
                      alt="Point 2"
                      className="w-full h-[300px] object-cover rounded-2xl shadow-md"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
                <p className="text-lg leading-relaxed whitespace-pre-wrap opacity-80">{data.sections.point3.desc}</p>
              </div>
            </div>
          )}

          {data.sections.point4.visible && (
            <div className={`${getSpacingClass()} px-6 bg-white`} style={{ backgroundColor: data.colors.background }}>
              <h3 className={`text-xl font-bold mb-10 ${data.options.align === "center" ? "text-center" : "text-left"}`}>{data.sections.point4.title}</h3>
              <div className="flex justify-center flex-wrap gap-4 text-center border-t border-b border-gray-100 py-8">
                {data.sections.point4.stats.map((stat, idx) => (
                  <div key={idx} className="min-w-[100px] flex-1">
                    <div className="text-lg font-bold mb-2" style={{ color: data.colors.primary }}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.sections.moreImages?.visible &&
            (data.sections.moreImages.images || []).map(
              (url, idx) =>
                url && (
                  <div key={idx} className="w-full">
                    <img src={getProxyUrl(url)} alt={`Detail ${idx}`} className="w-full h-auto object-cover block" crossOrigin="anonymous" />
                  </div>
                )
            )}

          {data.sections.info.visible && (
            <div className="py-8 px-6 text-xs text-gray-400 border-t border-gray-100 text-center leading-relaxed whitespace-pre-wrap bg-white">
              {data.sections.info.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
