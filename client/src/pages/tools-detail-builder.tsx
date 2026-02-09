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
    label: "\uBDF0\uD2F0/\uD654\uC7A5\uD488",
    icon: "\u2728",
    data: {
      brand: "PURE & CLEAN",
      productName: "\uD788\uC54C\uB8E8\uB860\uC0B0 \uC218\uBD84 \uC9C4\uC815 \uD1A0\uB108",
      catchphrase: "\uC18D\uAC74\uC870\uB97C \uC7A1\uB294 3\uCD08\uC758 \uAE30\uC801\n\uD53C\uBD80 \uAE4A\uC219\uC774 \uCC28\uC624\uB974\uB294 \uC218\uBD84\uAD11",
      colors: { primary: "#436750", background: "#ffffff", text: "#1a1a1a", accent: "#E8F5E9" },
      options: { font: "sans", align: "center", spacing: "normal", badgeStyle: "rounded" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1000&auto=format&fit=crop", text: "\uC790\uC5F0\uC5D0\uC11C \uCC3E\uC740\n\uAC00\uC7A5 \uC21C\uC218\uD55C \uC9C4\uC815" },
        point1: { visible: true, type: "check", title: "\uC544\uBB34\uB9AC \uBC1C\uB77C\uB3C4 \uAC74\uC870\uD55C\uAC00\uC694?", items: ["\uC138\uC548 \uD6C4 3\uCD08 \uB9CC\uC5D0 \uB2F9\uAE30\uB294 \uD53C\uBD80", "\uAC89\uC740 \uBC88\uB4E4\uAC70\uB9AC\uACE0 \uC18D\uC740 \uB9C8\uB974\uB294 \uC218\uBD80\uC9C0", "\uC608\uBBFC\uD574\uC11C \uC544\uBB34\uAC70\uB098 \uBC14\uB97C \uC218 \uC5C6\uB294 \uD53C\uBD80"] },
        point2: { visible: true, type: "image", layout: "normal", title: "Point 01. 10\uC911 \uD788\uC54C\uB8E8\uB860\uC0B0", desc: "\uBD84\uC790 \uD06C\uAE30\uAC00 \uB2E4\uB978 10\uAC00\uC9C0 \uD788\uC54C\uB8E8\uB860\uC0B0\uC774\n\uD53C\uBD80 \uCE35\uCE35\uC774 \uC218\uBD84\uC744 \uCC44\uC6CC\uC90D\uB2C8\uB2E4.", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "normal", title: "Point 02. \uB048\uC801\uC784 \uC5C6\uB294 \uC6CC\uD130 \uC81C\uD615", desc: "\uBB3C\uCC98\uB7FC \uAC00\uBCD5\uAC8C \uC2A4\uBA70\uB4E4\uC5B4\n\uC0B0\uBB3B\uD55C \uB9C8\uBB34\uB9AC\uAC10\uC744 \uC120\uC0AC\uD569\uB2C8\uB2E4.", image: "https://images.unsplash.com/photo-1556228720-197793570634?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "\uAC80\uC99D\uB41C \uD6A8\uACFC, \uBBFF\uC744 \uC218 \uC788\uB294 \uC218\uCE58", stats: [{ label: "\uC218\uBD84 \uAC1C\uC120\uC728", value: "148%" }, { label: "\uD53C\uBD80 \uC790\uADF9\uB3C4", value: "0.00" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "\uC81C\uD488\uBA85: \uC218\uBD84 \uC9C4\uC815 \uD1A0\uB108 | \uC6A9\uB7C9: 200ml | \uC81C\uC870\uAD6D: \uB300\uD55C\uBBFC\uAD6D" },
      },
    },
  },
  figure: {
    label: "\uD53C\uADDC\uC5B4/\uAD7F\uC988",
    icon: "\uD83E\uDD16",
    data: {
      brand: "COLLECTOR'S JOY",
      productName: "1/6 \uC2A4\uCF00\uC77C \uB4DC\uB798\uACE4 \uC2AC\uB808\uC774\uC5B4",
      catchphrase: "\uC804\uC124\uC801\uC778 \uB514\uD14C\uC77C\uC758 \uADC0\uD658\n\uC555\uB3C4\uC801\uC778 \uC874\uC7AC\uAC10\uC744 \uC18C\uC7A5\uD558\uC138\uC694",
      colors: { primary: "#374151", background: "#F3F4F6", text: "#111827", accent: "#E5E7EB" },
      options: { font: "sans", align: "left", spacing: "wide", badgeStyle: "square" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?q=80&w=1000&auto=format&fit=crop", text: "\uC5B4\uB460 \uC18D\uC5D0\uC11C\uB3C4 \uBE5B\uB098\uB294\n\uAD81\uADF9\uC758 \uC870\uD615\uBBF8" },
        point1: { visible: true, type: "check", title: "\uC218\uC9D1\uAC00\uB4E4\uC774 \uC5F4\uAD11\uD558\uB294 \uC774\uC720", items: ["\uC6D0\uC791\uC744 \uC644\uBCBD\uD558\uAC8C \uC7AC\uD604\uD55C \uD5E4\uB4DC \uC870\uD615", "\uC790\uC720\uB85C\uC6B4 \uD3EC\uC9D5\uC774 \uAC00\uB2A5\uD55C 32\uAC1C \uAD00\uC808", "\uB9AC\uC5BC\uD55C \uC6E8\uB354\uB9C1 \uB3C4\uC0C9 \uB9C8\uAC10"] },
        point2: { visible: true, type: "image", layout: "full", title: "Detail 01. \uC228\uB9C9\uD788\uB294 \uD5E4\uB4DC \uD004\uB9AC\uD2F0", desc: "\uD53C\uBD80 \uC9C8\uAC10\uBD80\uD130 \uB208\uB3D9\uC790\uC758 \uAD11\uCC44\uAE4C\uC9C0,\n\uC7A5\uC778\uC758 \uC190\uAE38\uB85C \uC644\uC131\uB41C \uB9AC\uC5BC\uB9AC\uC998\uC744 \uACBD\uD5D8\uD558\uC138\uC694.", image: "https://images.unsplash.com/photo-1614285997237-dbad57088918?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "full", title: "Detail 02. \uD48D\uC131\uD55C \uB8E8\uC988 \uAD6C\uC131", desc: "\uB2E4\uC591\uD55C \uC190 \uD30C\uCE20\uC640 \uBB34\uAE30 \uC138\uD2B8\uAC00 \uD3EC\uD568\uB418\uC5B4\n\uB2E4\uC774\uB0B4\uBBF9\uD55C \uC5F0\uCD9C\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4.", image: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "\uC81C\uD488 \uC0C1\uC138 \uC2A4\uD399", stats: [{ label: "\uD06C\uAE30 (\uB192\uC774)", value: "32cm" }, { label: "\uC18C\uC7AC", value: "PVC/ABS" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "\uC81C\uD488\uBA85: \uB4DC\uB798\uACE4 \uC2AC\uB808\uC774\uC5B4 | \uC0AC\uC6A9\uC5F0\uB839: 15\uC138 \uC774\uC0C1 | \uC81C\uC870\uAD6D: \uC911\uAD6D OEM" },
      },
    },
  },
  food: {
    label: "\uC2DD\uD488/\uAC74\uAC15",
    icon: "\uD83E\uDD57",
    data: {
      brand: "FRESH TABLE",
      productName: "\uD504\uB9AC\uBBF8\uC5C4 \uC0DD \uC544\uBCF4\uCE74\uB3C4",
      catchphrase: "\uC232\uC18D\uC758 \uBC84\uD130, \uC2DD\uD0C1 \uC704\uC758 \uAC74\uAC15\n\uAC00\uC7A5 \uC2E0\uC120\uD560 \uB54C \uB9CC\uB098\uBCF4\uC138\uC694",
      colors: { primary: "#65a30d", background: "#ffffff", text: "#1a1a1a", accent: "#ecfccb" },
      options: { font: "serif", align: "center", spacing: "normal", badgeStyle: "rounded" },
      sections: {
        intro: { visible: true, image: "https://images.unsplash.com/photo-1523049673856-42848f5d1b23?q=80&w=1000&auto=format&fit=crop", text: "\uB9E4\uC77C \uC544\uCE68 \uB9CC\uB098\uB294\n\uC2E0\uC120\uD55C \uCD08\uB85D \uC5D0\uB108\uC9C0" },
        point1: { visible: true, type: "check", title: "\uC774\uB7F0 \uBD84\uB4E4\uAED8 \uCD94\uCC9C\uD574\uC694", items: ["\uAC04\uD3B8\uD558\uACE0 \uAC74\uAC15\uD55C \uC544\uCE68\uC744 \uCC3E\uB294 \uBD84", "\uB2E4\uC774\uC5B4\uD2B8 \uC2DD\uB2E8 \uAD00\uB9AC\uAC00 \uD544\uC694\uD558\uC2E0 \uBD84", "\uCCA8\uAC00\uBB3C \uC5C6\uB294 \uC21C\uC218 \uC790\uC5F0\uC2DD\uC744 \uC6D0\uD558\uC2DC\uB294 \uBD84"] },
        point2: { visible: true, type: "image", layout: "normal", title: "Taste. \uD06C\uB9AC\uBBF8\uD55C \uD48D\uBBF8", desc: "\uC785\uC548 \uAC00\uB4DD \uD37C\uC9C0\uB294 \uACE0\uC18C\uD568\uACFC \uBD80\uB4DC\uB7EC\uC6C0,\n\uC5B4\uB5A4 \uC694\uB9AC\uC640\uB3C4 \uC644\uBCBD\uD55C \uC870\uD654\uB97C \uC774\uB8F9\uB2C8\uB2E4.", image: "https://images.unsplash.com/photo-1601039641847-7857b994d704?q=80&w=1000&auto=format&fit=crop" },
        point3: { visible: true, type: "image", layout: "normal", title: "Fresh. \uC0B0\uC9C0 \uC9C1\uC1A1 \uC2DC\uC2A4\uD15C", desc: "\uAC00\uC7A5 \uB9DB\uC788\uB294 \uD6C4\uC219 \uB2E8\uACC4\uC5D0\uC11C \uC218\uD655\uD558\uC5EC\n\uB2F9\uC2E0\uC758 \uC2DD\uD0C1\uAE4C\uC9C0 \uBE60\uB974\uAC8C \uBC30\uC1A1\uD569\uB2C8\uB2E4.", image: "https://images.unsplash.com/photo-1615486511484-92e5724d1c12?q=80&w=1000&auto=format&fit=crop" },
        point4: { visible: true, type: "stats", title: "\uC601\uC591 \uC815\uBCF4 (100g\uB2F9)", stats: [{ label: "\uCE7C\uB85C\uB9AC", value: "160kcal" }, { label: "\uC2DD\uC774\uC12C\uC720", value: "7g" }] },
        moreImages: { visible: true, images: [] },
        info: { visible: true, content: "\uC81C\uD488\uBA85: \uC0DD \uC544\uBCF4\uCE74\uB3C4 | \uC6D0\uC0B0\uC9C0: \uBA55\uC2DC\uCF54 | \uBCF4\uAD00\uBC29\uBC95: \uC11C\uB298\uD55C \uACF3\uC5D0 \uBCF4\uAD00" },
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
        <CheckCircle className="w-4 h-4" /> AI \uAE30\uD68D \uD504\uB86C\uD504\uD2B8
      </h3>
      <p className="text-sm text-blue-700 mb-3">
        \uC0C1\uD488\uC5D0 \uB9DE\uCDB0 \uC544\uB798 \uD504\uB86C\uD504\uD2B8\uB97C \uBCF5\uC0AC\uD558\uC5EC AI(ChatGPT \uB4F1)\uC5D0\uAC8C \uBB3C\uC5B4\uBCF4\uC138\uC694.
      </p>
      <div className="bg-white p-3 rounded border border-blue-200 text-xs text-gray-600 font-mono relative">
        "{TEMPLATES[currentTemplate].label} \uC0C1\uC138\uD398\uC774\uC9C0\uB97C \uB9CC\uB4E4\uB824\uACE0 \uD574. [\uC0C1\uD488\uBA85]\uC744 \uD314\uAE30 \uC704\uD55C \uB17C\uB9AC \uAD6C\uC870(\uC778\uD2B8\uB85C-\uD6C4\uD0B9-\uD2B9\uC7A5\uC8101-\uD2B9\uC7A5\uC8102-\uC2E0\uB8B0)\uB97C \uC9DC\uC8FC\uACE0, \uAC01 \uC139\uC158\uC5D0 \uB4E4\uC5B4\uAC08 \uB9E4\uB825\uC801\uC778 \uCE74\uD53C\uB77C\uC774\uD305\uC744 \uC791\uC131\uD574\uC918."
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(
              `"${TEMPLATES[currentTemplate].label} \uC0C1\uC138\uD398\uC774\uC9C0\uB97C \uB9CC\uB4E4\uB824\uACE0 \uD574. [\uC0C1\uD488\uBA85]\uC744 \uD314\uAE30 \uC704\uD55C \uB17C\uB9AC \uAD6C\uC870(\uC778\uD2B8\uB85C-\uD6C4\uD0B9-\uD2B9\uC7A5\uC8101-\uD2B9\uC7A5\uC8102-\uC2E0\uB8B0)\uB97C \uC9DC\uC8FC\uACE0, \uAC01 \uC139\uC158\uC5D0 \uB4E4\uC5B4\uAC08 \uB9E4\uB825\uC801\uC778 \uCE74\uD53C\uB77C\uC774\uD305\uC744 \uC791\uC131\uD574\uC918."`
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
    <SectionBlock title="1. \uB808\uC774\uC544\uC6C3 & \uC2A4\uD0C0\uC77C">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">\uD14D\uC2A4\uD2B8 \uC815\uB82C</label>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              type="button"
              onClick={() => updateOption("align", "left")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.align === "left" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-align-left"
            >
              <AlignLeft className="w-3 h-3" /> \uC67C\uCABD \uC815\uB82C
            </button>
            <button
              type="button"
              onClick={() => updateOption("align", "center")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.align === "center" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-align-center"
            >
              <AlignCenter className="w-3 h-3" /> \uAC00\uC6B4\uB370 \uC815\uB82C
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">\uD3F0\uD2B8 \uC2A4\uD0C0\uC77C</label>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              type="button"
              onClick={() => updateOption("font", "sans")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.font === "sans" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-font-sans"
            >
              <Type className="w-3 h-3" /> \uACE0\uB515 (\uAE54\uB054)
            </button>
            <button
              type="button"
              onClick={() => updateOption("font", "serif")}
              className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 transition-all ${data.options.font === "serif" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
              data-testid="button-font-serif"
            >
              <Type className="w-3 h-3" /> \uBA85\uC870 (\uAC10\uC131)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">\uC139\uC158 \uAC04\uACA9 (\uC5EC\uBC31)</label>
          <div className="flex bg-gray-100 rounded p-1">
            {(["compact", "normal", "wide"] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => updateOption("spacing", opt)}
                className={`flex-1 py-1 text-xs rounded capitalize transition-all ${data.options.spacing === opt ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
                data-testid={`button-spacing-${opt}`}
              >
                {opt === "compact" ? "\uC881\uAC8C" : opt === "normal" ? "\uBCF4\uD1B5" : "\uB113\uAC8C"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionBlock>

    <SectionBlock title="2. \uC139\uC158 \uD45C\uC2DC (ON/OFF)">
      <div className="space-y-2">
        {[
          { id: "intro", label: "\uC778\uD2B8\uB85C (\uD0C0\uC774\uD2C0)" },
          { id: "point1", label: "\uCCB4\uD06C\uB9AC\uC2A4\uD2B8 (\uBB38\uC81C\uC81C\uAE30)" },
          { id: "point2", label: "\uD3EC\uC778\uD2B8 01 (\uD2B9\uC7A5\uC810)" },
          { id: "point3", label: "\uD3EC\uC778\uD2B8 02 (\uB514\uD14C\uC77C)" },
          { id: "point4", label: "\uC2A4\uD399/\uAC80\uC99D (\uC2E0\uB8B0)" },
          { id: "moreImages", label: "\uC0C1\uC138 \uC774\uBBF8\uC9C0 \uCD94\uAC00 (\uC790\uC720)" },
          { id: "info", label: "\uD558\uB2E8 \uC815\uBCF4 \uACE0\uC2DC" },
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
    <SectionBlock title="\uAE30\uBCF8 \uC815\uBCF4">
      <LocalInput label="\uBE0C\uB79C\uB4DC\uBA85" value={data.brand} onChange={(v) => setData((prev) => ({ ...prev, brand: v }))} />
      <LocalInput label="\uC0C1\uD488\uBA85" value={data.productName} onChange={(v) => setData((prev) => ({ ...prev, productName: v }))} />
      <LocalTextArea label="\uBA54\uC778 \uCE74\uD53C" value={data.catchphrase} onChange={(v) => setData((prev) => ({ ...prev, catchphrase: v }))} />
    </SectionBlock>

    {data.sections.intro.visible && (
      <SectionBlock title="\uC778\uD2B8\uB85C">
        <LocalInput label="\uC774\uBBF8\uC9C0 URL" value={data.sections.intro.image} onChange={(v) => updateSection("intro", "image", v)} />
        <LocalTextArea label="\uBB38\uAD6C" value={data.sections.intro.text} onChange={(v) => updateSection("intro", "text", v)} />
      </SectionBlock>
    )}

    {data.sections.point1.visible && (
      <SectionBlock title="\uCCB4\uD06C\uB9AC\uC2A4\uD2B8 (\uD56D\uBAA9 \uCD94\uAC00/\uC0AD\uC81C)">
        <LocalInput label="\uC81C\uBAA9" value={data.sections.point1.title} onChange={(v) => updateSection("point1", "title", v)} />
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
          <Plus className="w-3 h-3" /> \uD56D\uBAA9 \uCD94\uAC00
        </button>
      </SectionBlock>
    )}

    {data.sections.point2.visible && (
      <SectionBlock title="\uD3EC\uC778\uD2B8 01">
        <LocalInput label="\uC81C\uBAA9" value={data.sections.point2.title} onChange={(v) => updateSection("point2", "title", v)} />
        <LocalInput label="\uC774\uBBF8\uC9C0 URL" value={data.sections.point2.image} onChange={(v) => updateSection("point2", "image", v)} />
        <LocalTextArea label="\uC124\uBA85" value={data.sections.point2.desc} onChange={(v) => updateSection("point2", "desc", v)} />
      </SectionBlock>
    )}

    {data.sections.point3.visible && (
      <SectionBlock title="\uD3EC\uC778\uD2B8 02">
        <LocalInput label="\uC81C\uBAA9" value={data.sections.point3.title} onChange={(v) => updateSection("point3", "title", v)} />
        <LocalInput label="\uC774\uBBF8\uC9C0 URL" value={data.sections.point3.image} onChange={(v) => updateSection("point3", "image", v)} />
        <LocalTextArea label="\uC124\uBA85" value={data.sections.point3.desc} onChange={(v) => updateSection("point3", "desc", v)} />
      </SectionBlock>
    )}

    {data.sections.point4.visible && (
      <SectionBlock title="\uC2A4\uD399/\uAC80\uC99D (\uD56D\uBAA9 \uCD94\uAC00/\uC0AD\uC81C)">
        <LocalInput label="\uC81C\uBAA9" value={data.sections.point4.title} onChange={(v) => updateSection("point4", "title", v)} />
        {data.sections.point4.stats.map((stat, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <div className="flex-1">
              <LocalInput
                placeholder="\uD56D\uBAA9\uBA85"
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
                placeholder="\uAC12"
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
          <Plus className="w-3 h-3" /> \uC2A4\uD399 \uCD94\uAC00
        </button>
      </SectionBlock>
    )}

    {data.sections.moreImages?.visible && (
      <SectionBlock title="8. \uC0C1\uC138 \uC774\uBBF8\uC9C0 \uCD94\uAC00 (\uC790\uC720)">
        <p className="text-xs text-gray-500 mb-3">\uBC30\uB108, \uB514\uD14C\uC77C\uCEF7 \uB4F1 \uC6D0\uD558\uB294 \uB9CC\uD07C \uC774\uBBF8\uC9C0\uB97C \uCD94\uAC00\uD558\uC138\uC694.</p>
        {(data.sections.moreImages.images || []).map((url, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <div className="text-xs text-gray-400 w-4 text-center">{idx + 1}</div>
            <LocalInput placeholder="\uC774\uBBF8\uC9C0 URL \uC785\uB825 (https://...)" value={url} onChange={(v) => updateMoreImage(idx, v)} />
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
          <Plus className="w-4 h-4" /> \uC774\uBBF8\uC9C0 \uCD94\uAC00\uD558\uAE30
        </button>
      </SectionBlock>
    )}

    {data.sections.info.visible && (
      <SectionBlock title="\uD558\uB2E8 \uC815\uBCF4">
        <LocalTextArea label="\uACE0\uC2DC \uC815\uBCF4" value={data.sections.info.content} onChange={(v) => updateSection("info", "content", v)} />
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
    <SectionBlock title="\uCEEC\uB7EC \uD14C\uB9C8">
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="\uBA54\uC778 \uCEEC\uB7EC (\uBE0C\uB79C\uB4DC)" value={data.colors.primary} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, primary: v } }))} />
        <ColorPicker label="\uBC30\uACBD \uCEEC\uB7EC" value={data.colors.background} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, background: v } }))} />
        <ColorPicker label="\uD14D\uC2A4\uD2B8 \uCEEC\uB7EC" value={data.colors.text} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, text: v } }))} />
        <ColorPicker label="\uAC15\uC870(\uBC15\uC2A4) \uCEEC\uB7EC" value={data.colors.accent} onChange={(v) => setData((prev) => ({ ...prev, colors: { ...prev.colors, accent: v } }))} />
      </div>
    </SectionBlock>
    <SectionBlock title="\uBC30\uC9C0 \uC2A4\uD0C0\uC77C">
      <div className="flex bg-gray-100 rounded p-1">
        <button
          type="button"
          onClick={() => updateOption("badgeStyle", "rounded")}
          className={`flex-1 py-1 text-xs rounded transition-all ${data.options.badgeStyle === "rounded" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
          data-testid="button-badge-rounded"
        >
          \uB465\uADFC\uD615
        </button>
        <button
          type="button"
          onClick={() => updateOption("badgeStyle", "square")}
          className={`flex-1 py-1 text-xs rounded transition-all ${data.options.badgeStyle === "square" ? "bg-white shadow text-indigo-600 font-bold" : "text-gray-500"}`}
          data-testid="button-badge-square"
        >
          \uC0AC\uAC01\uD615
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
    if (confirm("\uD15C\uD50C\uB9BF\uC744 \uBCC0\uACBD\uD558\uBA74 \uD604\uC7AC \uC791\uC131 \uC911\uC778 \uB0B4\uC6A9\uC774 \uCD08\uAE30\uD654\uB429\uB2C8\uB2E4. \uBCC0\uACBD\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
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
      link.download = `${data.brand}_\uC0C1\uC138\uD398\uC774\uC9C0.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("\uC774\uBBF8\uC9C0 \uC800\uC7A5 \uC2E4\uD328. \uC678\uBD80 \uC774\uBBF8\uC9C0 URL\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
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
    const newItems = [...data.sections.point1.items, "\uC0C8\uB85C\uC6B4 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 \uD56D\uBAA9"];
    updateSection("point1", "items", newItems);
  };
  const removeChecklistItem = (idx: number) => {
    const newItems = data.sections.point1.items.filter((_: string, i: number) => i !== idx);
    updateSection("point1", "items", newItems);
  };
  const addStatItem = () => {
    const newStats = [...data.sections.point4.stats, { label: "\uC0C8 \uD56D\uBAA9", value: "00%" }];
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
            \uC0C1\uC138\uD398\uC774\uC9C0 \uBE4C\uB354
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
            { id: "edit", label: "1. \uB0B4\uC6A9 \uD3B8\uC9D1", icon: Type },
            { id: "settings", label: "2. \uC124\uC815/\uAD6C\uC870", icon: Settings },
            { id: "design", label: "3. \uB514\uC790\uC778", icon: Palette },
            { id: "guide", label: "4. \uAE30\uD68D \uAC00\uC774\uB4DC", icon: HelpCircle },
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
            {isExporting ? "\uC0DD\uC131 \uC911..." : "\uD1B5\uC774\uBBF8\uC9C0 \uC800\uC7A5 (JPG)"}
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
