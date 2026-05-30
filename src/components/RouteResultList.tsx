/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SubwayRoute } from "../types";
import { Clock, RefreshCcw, Landmark, CreditCard, ChevronRight, CheckSquare, Sparkles, AlertCircle } from "lucide-react";

interface RouteResultListProps {
  routes: SubwayRoute[];
  selectedRouteId?: string;
  onSelectRoute: (route: SubwayRoute) => void;
}

export default function RouteResultList({ routes, selectedRouteId, onSelectRoute }: RouteResultListProps) {
  if (routes.length === 0) {
    return (
      <div className="bg-[#111114] rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2 animate-bounce" />
        <p className="text-xs font-semibold text-slate-300">조건에 맞는 지하철 경로가 계산되지 않았습니다.</p>
        <p className="text-[10px] text-slate-500 mt-1">출발역과 도착역을 정상 선별했는지 확인해 주세요.</p>
      </div>
    );
  }

  // Helper to extract first segment recommend label for quick visual review
  const getBoardingSummary = (route: SubwayRoute) => {
    const bd = route.segments.find(s => s.type === "BOARDING");
    if (bd && bd.recommendCarNum && bd.recommendDoorNum) {
      return `${bd.recommendCarNum}-${bd.recommendDoorNum}번 칸 탑승`;
    }
    return "기본 4-2번 탑승";
  };

  const getAlightingSummary = (route: SubwayRoute) => {
    const tr = route.segments.find(s => s.type === "TRANSFER");
    if (tr && tr.recommendCarNum && tr.recommendDoorNum) {
      return `[환승 최단] ${tr.recommendCarNum}-${tr.recommendDoorNum}번 하차`;
    }
    const al = route.segments.find(s => s.type === "ALIGHTING");
    if (al && al.recommendCarNum && al.recommendDoorNum) {
      return `[출구 최단] ${al.recommendCarNum}-${al.recommendDoorNum}번 하차`;
    }
    return "빠른 하차문 자동 매핑";
  };

  return (
    <div id="route-results-list" className="space-y-2 mb-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-white font-bold text-xs flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/10" />
          승하차 최적 연계 경로 대안 비교 ({routes.length}건)
        </h3>
        <span className="text-[10px] text-slate-500 font-medium">점수 가중치가 자동 계산됨</span>
      </div>

      <div className="space-y-3">
        {routes.map((route, index) => {
          const isSelected = selectedRouteId === route.id;
          const bgStyle = isSelected 
            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/5" 
            : "border-white/10 bg-[#111114] hover:bg-[#1C1C21] hover:border-white/20 shadow-sm";

          return (
            <div
              id={`route-card-item-${route.id}`}
              key={route.id}
              onClick={() => onSelectRoute(route)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${bgStyle}`}
            >
              {/* Badge for Rank / Label */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  index === 0 
                    ? "bg-emerald-500 text-black" 
                    : "bg-white/5 text-slate-400 border border-white/5"
                }`}>
                  {index === 0 ? "★ 추천 가이드 최고점" : `대안 코스 ${index + 1}`}
                </span>
                
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>예상 요금 <strong className="text-slate-300 font-bold">{route.fare.toLocaleString()}원</strong></span>
                </div>
              </div>

              {/* Time and walk summary specs in bold display */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-black text-white font-sans">
                  {route.totalDurationMin}
                  <span className="text-xs font-bold text-slate-400 ml-0.5">분</span>
                </span>
                
                <span className="text-xs font-semibold text-white/10">|</span>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-0.5">
                    <RefreshCcw className="w-3 h-3 text-emerald-400" />
                    환승 {route.transferCount}회
                  </span>
                  <span className="text-white/10">•</span>
                  <span className="flex items-center gap-0.5">
                    <Landmark className="w-3 h-3 text-sky-400" />
                    도보 {route.totalWalkDistanceMeter}m
                  </span>
                </div>
              </div>

              {/* Subway direct mini bullet points of boarding recommendations */}
              <div className="bg-[#1C1C21] border border-white/5 rounded-xl p-2.5 space-y-1.5 mb-2.5">
                <div className="flex items-center gap-2 text-[11px] min-h-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-400 font-medium shrink-0">권장 승차문:</span>
                  <span className="text-slate-200 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                    {getBoardingSummary(route)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-[11px] min-h-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-slate-400 font-medium shrink-0">맞춤 하차위:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {getAlightingSummary(route)}
                  </span>
                </div>
              </div>

              {/* Brief Reason and Safety Warnings */}
              <p className="text-[10px] text-slate-400 leading-relaxed mb-2.5">
                {route.recomReason}
              </p>

              {route.warnings && route.warnings.length > 0 && (
                <div className="py-1.5 px-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-1.5 text-[9px] text-rose-400">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">{route.warnings[0]}</span>
                </div>
              )}

              {/* Action Indicator */}
              <div className={`absolute right-3 bottom-3 flex items-center gap-0.5 text-[10px] font-bold ${
                isSelected ? "text-emerald-400" : "text-slate-500"
              }`}>
                {isSelected ? "활성 안내중" : "선택 안내"}
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
