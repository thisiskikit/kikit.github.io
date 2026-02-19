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
  PackageOpen,
  Wallet,
} from "lucide-react";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  helpTitle: string;
  helpLines: string[];
  locked?: boolean;
};

const mainMenu: MenuItem[] = [
  {
    title: "Products",
    url: "/products",
    icon: Package,
    helpTitle: "Products",
    helpLines: ["Browse product list and search by name, code, id, or brand."],
  },
  {
    title: "Draft",
    url: "/draft",
    icon: FileEdit,
    helpTitle: "Draft",
    helpLines: ["Stage temporary edits before validation/export."],
  },
  {
    title: "Validate",
    url: "/validate",
    icon: ShieldCheck,
    helpTitle: "Validate",
    helpLines: ["Run validation checks on staged draft changes."],
  },
  {
    title: "Export",
    url: "/export",
    icon: Download,
    helpTitle: "Export",
    helpLines: ["Export validated results as XLSX."],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    helpTitle: "Settings",
    helpLines: ["Inspect environment and integration status."],
  },
];

const toolsMenu: MenuItem[] = [
  {
    title: "Box Packing",
    url: "/tools/box-packing",
    icon: Box,
    helpTitle: "Box Packing",
    helpLines: ["Arrange product images on a 3D box and export PNG."],
  },
  {
    title: "Visual Box Packing",
    url: "/tools/smart-box",
    icon: PackageOpen,
    helpTitle: "Visual Box Packing",
    helpLines: ["Interactive visual box placement with fill controls."],
  },
  {
    title: "Box Template",
    url: "/tools/box-template",
    icon: Box,
    helpTitle: "Box Template",
    helpLines: ["Create reusable custom box templates and save as PNG."],
  },
  {
    title: "Detail Builder",
    url: "/tools/detail-builder",
    icon: FileImage,
    helpTitle: "Detail Builder",
    helpLines: ["Compose product detail pages with blocks and export."],
  },
];

const featureMenu: MenuItem[] = [
  {
    title: "URL Crawler",
    url: "/features/crawler",
    icon: Globe,
    helpTitle: "URL Crawler",
    helpLines: ["Queue crawling jobs from product URLs."],
    locked: true,
  },
  {
    title: "Price Editor",
    url: "/features/price-editor",
    icon: DollarSign,
    helpTitle: "Price Editor",
    helpLines: ["Queue bulk price update jobs."],
    locked: true,
  },
  {
    title: "Image Translate",
    url: "/features/image-translate",
    icon: Languages,
    helpTitle: "Image Translate",
    helpLines: ["Upload/select image and run translation job."],
    locked: false,
  },
  {
    title: "Image Cutout",
    url: "/features/image-cutout",
    icon: Scissors,
    helpTitle: "Image Cutout",
    helpLines: ["Upload/select image and run background-removal job."],
    locked: false,
  },
  {
    title: "SKU Search",
    url: "/features/sku-search",
    icon: Search,
    helpTitle: "SKU Search",
    helpLines: ["Direct SKU search and composition-to-SKU matching."],
    locked: false,
  },
  {
    title: "Household Ledger",
    url: "/features/household-ledger",
    icon: Wallet,
    helpTitle: "Household Ledger",
    helpLines: ["Track monthly income/expense entries in local storage."],
    locked: false,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const renderItem = (item: MenuItem) => {
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
            <p className="text-xs text-muted-foreground leading-tight">Import / Product Ops Toolkit</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            Core
            <HelpTip title="Core" lines={["Primary editing and export flow."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            Tools
            <HelpTip title="Tools" lines={["Utilities for visual/creative workflows."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{toolsMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            Features
            <HelpTip title="Features" lines={["Advanced and queued operations."]} side="right" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{featureMenu.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground text-center">KIKIT v1</p>
      </SidebarFooter>
    </Sidebar>
  );
}
