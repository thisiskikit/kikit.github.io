import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTipProps {
  title: string;
  lines: string[];
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function HelpTip({ title, lines, side = "top", className = "" }: HelpTipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center cursor-help ${className}`} data-testid="help-tip">
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-3">
        <p className="font-semibold text-xs mb-1">{title}</p>
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
