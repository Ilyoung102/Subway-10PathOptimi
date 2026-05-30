/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TransitMode } from "../types";
import { Zap, Trees, RefreshCw, Accessibility, ShieldAlert, Umbrella, Sparkles, AlertTriangle } from "lucide-react";

interface VulnerableWidgetProps {
  currentMode: TransitMode;
  onChangeMode: (mode: TransitMode) => void;
}

interface ModeOption {
  value: TransitMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}

const MODES: ModeOption[] = [
  {
    value: "FASTEST",
    label: "가장 빠른 경로",
    desc: "최단 승차칸 탑승으로 환승 및 하차 대기 최소화",
    icon: Zap,
    color: "from-blue-500 to-indigo-600",
    badge: "추천"
  },
  {
    value: "LEAST_WALK",
    label: "적게 걷는 경로",
    desc: "환승 통로 및 도보 이동 거리가 가장 짧은 동선 우선",
    icon: Trees,
    color: "from-emerald-500 to-teal-600",
    badge: "편안"
  },
  {
    value: "FEW_TRANSFERS",
    label: "환승 최소 경로",
    desc: "이동선이 길어지더라도 환승 회수를 줄인 안심 코스",
    icon: RefreshCw,
    color: "from-violet-500 to-purple-600",
    badge: "직통"
  },
  {
    value: "EASY_ACCESS",
    label: "교통약자 모드",
    desc: "계단을 배제하고 엘리베이터 및 무장애 동선 우선 배치",
    icon: Accessibility,
    color: "from-pink-500 to-rose-600",
    badge: "안전"
  }
];

export default function VulnerableWidget({ currentMode, onChangeMode }: VulnerableWidgetProps) {
  return (
    <div id="vulnerable-mode-container" className="bg-[#111114] rounded-2xl border border-white/10 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            승하차 추천 커스텀 필터
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">상황에 맞게 승하차 추천 정보를 최적화합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = currentMode === mode.value;

          return (
            <button
              id={`mode-toggle-${mode.value}`}
              key={mode.value}
              onClick={() => onChangeMode(mode.value)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm shadow-emerald-500/5"
                  : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`p-1.5 rounded-lg ${
                    isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? "bg-emerald-500 text-black"
                      : "bg-white/5 text-slate-400 border border-white/5"
                  }`}
                >
                  {mode.badge}
                </span>
              </div>
              
              <h4 className="font-semibold text-slate-200 text-xs mt-1">{mode.label}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                {mode.desc}
              </p>

              {isSelected && (
                <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-emerald-500 rounded-tl-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
