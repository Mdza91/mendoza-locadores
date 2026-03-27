import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme, COLOR_THEMES, ColorTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const colorClasses: Record<ColorTheme, string> = {
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
};

export function ThemeSelector() {
  const { colorTheme, setColorTheme, isDark, toggleDark } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 p-0 hover:bg-muted/80 transition-colors"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-4" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Modo oscuro</span>
            </div>
            <Switch 
              checked={isDark} 
              onCheckedChange={toggleDark}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Color Palette */}
          <div>
            <p className="text-sm font-medium mb-3">Color principal</p>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setColorTheme(theme.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all",
                    "hover:bg-muted/80",
                    colorTheme === theme.id && "bg-muted ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <div 
                    className={cn(
                      "h-8 w-8 rounded-full shadow-sm transition-transform",
                      "hover:scale-110",
                      colorClasses[theme.id]
                    )}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
