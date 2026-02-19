import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import ProductsPage from "@/pages/products";
import DraftPage from "@/pages/draft";
import ValidatePage from "@/pages/validate";
import ExportPage from "@/pages/export";
import SettingsPage from "@/pages/settings";
import BoxPackingPage from "@/pages/tools-box-packing";
import SmartBoxPage from "@/pages/tools-smart-box";
import BoxTemplatePage from "@/pages/tools-box-template";
import DetailBuilderPage from "@/pages/tools-detail-builder";
import FeatureCrawlerPage from "@/pages/feature-crawler";
import FeaturePriceEditorPage from "@/pages/feature-price-editor";
import FeatureImageTranslatePage from "@/pages/feature-image-translate";
import FeatureImageCutoutPage from "@/pages/feature-image-cutout";
import FeatureSkuSearchPage from "@/pages/feature-sku-search";
import FeatureHouseholdLedgerPage from "@/pages/feature-household-ledger";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/products" />
      </Route>
      <Route path="/products" component={ProductsPage} />
      <Route path="/draft" component={DraftPage} />
      <Route path="/validate" component={ValidatePage} />
      <Route path="/export" component={ExportPage} />
      <Route path="/settings" component={SettingsPage} />

      <Route path="/tools/box-packing" component={BoxPackingPage} />
      <Route path="/tools/smart-box" component={SmartBoxPage} />
      <Route path="/tools/box-template" component={BoxTemplatePage} />
      <Route path="/tools/detail-builder" component={DetailBuilderPage} />

      <Route path="/features/crawler" component={FeatureCrawlerPage} />
      <Route path="/features/price-editor" component={FeaturePriceEditorPage} />
      <Route path="/features/image-translate" component={FeatureImageTranslatePage} />
      <Route path="/features/image-cutout" component={FeatureImageCutoutPage} />
      <Route path="/features/sku-search" component={FeatureSkuSearchPage} />
      <Route path="/features/household-ledger" component={FeatureHouseholdLedgerPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center gap-2 p-2 border-b shrink-0 sticky top-0 z-50 bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <span className="text-sm font-medium text-muted-foreground">KIKIT Product Manager</span>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
