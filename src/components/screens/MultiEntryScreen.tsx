"use client";

import { useState } from "react";
import { DoorOpen, Loader2, PlusCircle } from "lucide-react";

import { ScreenShell } from "@/components/screens/HomeScreen";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MultiEntryScreen({
  name,
  initialCode = "",
  onNameChange,
  onCreate,
  onJoin,
  busy,
  error,
  onBack,
}: {
  name: string;
  /** ?code=ABCDEF 로 들어온 경우 미리 채워 둔다. */
  initialCode?: string;
  onNameChange: (next: string) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  busy: "create" | "join" | null;
  error: string | null;
  onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const ready = code.length === 6;

  return (
    <ScreenShell title="멀티플레이" onBack={onBack}>
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            내 이름
          </span>
          <Input
            value={name}
            maxLength={12}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="상대에게 보일 이름"
          />
        </label>

        <Card className="p-4">
          <CardTitle>방 만들기</CardTitle>
          <CardDescription className="mt-1">
            6자리 코드를 받아 상대에게 알려 주세요. 방식과 판 설정은 방장이 정합니다.
          </CardDescription>
          <Button
            className="mt-4 w-full"
            onClick={onCreate}
            disabled={busy !== null || !name.trim()}
          >
            {busy === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlusCircle className="size-4" />
            )}
            방 만들기
          </Button>
        </Card>

        <Card className="p-4">
          <CardTitle>방 참가</CardTitle>
          <CardDescription className="mt-1">
            받은 6자리 코드를 입력하세요.
          </CardDescription>

          <form
            className="mt-4 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) onJoin(code);
            }}
          >
            <Input
              value={code}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              aria-label="방 코드"
              placeholder="ABCDEF"
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6))
              }
              className={cn(
                "h-14 text-center font-mono text-2xl font-bold tracking-[0.4em]",
                "placeholder:tracking-[0.4em] placeholder:opacity-35",
              )}
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={!ready || busy !== null || !name.trim()}
            >
              {busy === "join" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <DoorOpen className="size-4" />
              )}
              참가하기
            </Button>
          </form>
        </Card>

        {error ? (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </ScreenShell>
  );
}
