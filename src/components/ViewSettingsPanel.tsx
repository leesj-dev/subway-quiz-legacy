"use client";

import { SettingRow } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ViewSettings } from "@/lib/game";

/**
 * 게임 중에도 언제든 바꿀 수 있는 보기 설정.
 * 점수에 영향을 주지 않으므로 판 설정(SetupPanel)과 분리해 둔다.
 */
export function ViewSettingsPanel({
  value,
  onChange,
}: {
  value: ViewSettings;
  onChange: (next: ViewSettings) => void;
}) {
  return (
    <div className="divide-y">
      <div className="flex items-center gap-3 py-2.5">
        <div className="w-20 shrink-0 text-sm font-bold">투명도</div>
        <Slider
          value={value.dim}
          aria-label="선택하지 않은 노선의 투명도"
          onValueChange={(dim) => onChange({ ...value, dim })}
        />
        <div className="tnum w-9 shrink-0 text-right text-xs text-muted-foreground">
          {value.dim}%
        </div>
      </div>

      <SettingRow
        label="환승역 타 노선 색 표시"
        control={
          <Switch
            checked={value.transferColors}
            aria-label="환승역 타 노선 색 표시"
            onCheckedChange={(v) => onChange({ ...value, transferColors: v })}
          />
        }
      />
      <SettingRow
        label="노선 클릭 시 확대"
        control={
          <Switch
            checked={value.zoomOnSelect}
            aria-label="노선 클릭 시 확대"
            onCheckedChange={(v) => onChange({ ...value, zoomOnSelect: v })}
          />
        }
      />
    </div>
  );
}
