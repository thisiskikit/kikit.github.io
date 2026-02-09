import { HelpTip } from "./help-tip";

interface PageHeaderProps {
  title: string;
  description?: string;
  helpTitle: string;
  helpLines: string[];
  children?: React.ReactNode;
}

export function PageHeader({ title, description, helpTitle, helpLines, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <HelpTip title={helpTitle} lines={helpLines} />
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
