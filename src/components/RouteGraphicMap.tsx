/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SubwayRoute, RouteSegment } from "../types";
import { Train, ArrowRightLeft, MapPin, ChevronRight, CheckCircle, HelpCircle } from "lucide-react";

interface RouteGraphicMapProps {
  route: SubwayRoute;
  onMapClick?: () => void;
}

// Map of line codes to hex colors for official visualization
const LINE_COLORS: Record<string, string> = {
  "1": "#0052A4", // 1호선
  "2": "#009255", // 2호선
  "3": "#EF7C1C", // 3호선
  "4": "#00A5DE", // 4호선
  "5": "#996CAC", // 5호선
  "6": "#CD7C2F", // 6호선
  "7": "#747F28", // 7호선
  "8": "#E6186C", // 8호선
  "9": "#BDB092", // 9호선
  "DX": "#D4003B", // 신분당선
  "K": "#77C4A3",  // 경의중앙선
  "SB": "#F5A200"  // 수인분당선
};

export default function RouteGraphicMap({ route, onMapClick }: RouteGraphicMapProps) {
  const [showStopsIndex, setShowStopsIndex] = useState<number | null>(null);

  // Parse segments for display
  const boardingSeg = route.segments.find(s => s.type === "BOARDING");
  const transferSegs = route.segments.filter(s => s.type === "TRANSFER");
  const alightingSeg = route.segments.find(s => s.type === "ALIGHTING");
  
  // Calculate distinct running stages
  const runningStages: {
    lineCode: string;
    lineName: string;
    color: string;
    startName: string;
    endName: string;
    stopCount: number;
    stopList: string[];
  }[] = [];

  let currentLineCode = "";
  let currentLineName = "";
  let startStName = "";
  let accumulatedStops: string[] = [];

  route.segments.forEach((seg, index) => {
    if (seg.type === "BOARDING" || seg.type === "TRANSFER") {
      if (currentLineCode) {
        // Close previous running stage
        runningStages.push({
          lineCode: currentLineCode,
          lineName: currentLineName,
          color: LINE_COLORS[currentLineCode] || "#64748B",
          startName: startStName,
          endName: seg.stationName,
          stopCount: accumulatedStops.length,
          stopList: [...accumulatedStops]
        });
      }
      currentLineCode = seg.lineCode || "";
      currentLineName = seg.lineName || "";
      startStName = seg.stationName;
      accumulatedStops = [];
    } else if (seg.type === "RUNNING") {
      if (seg.stopStationsList) {
        accumulatedStops.push(...seg.stopStationsList);
      }
    } else if (seg.type === "ALIGHTING") {
      if (currentLineCode) {
        runningStages.push({
          lineCode: currentLineCode,
          lineName: currentLineName,
          color: LINE_COLORS[currentLineCode] || "#64748B",
          startName: startStName,
          endName: seg.stationName,
          stopCount: accumulatedStops.length,
          stopList: [...accumulatedStops]
        });
      }
      currentLineCode = "";
    }
  });

  // Unique identifier for visualization elements
  const hasTransfers = runningStages.length > 1;

  return (
    <div 
      onClick={onMapClick}
      className={`bg-[#15151A]/85 backdrop-blur-md rounded-2xl border border-white/10 p-5 mt-2 space-y-4 shadow-xl relative overflow-hidden transition-all duration-300 select-none ${
        onMapClick 
          ? "cursor-pointer hover:border-emerald-500/40 hover:bg-[#1A1A22]/95 hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] group/gmap" 
          : ""
      }`}
    >
      {/* Background glow lines matching route color */}
      <div 
        className="absolute -right-20 -top-20 w-44 h-44 rounded-full opacity-10 blur-3xl transition-all"
        style={{ backgroundColor: LINE_COLORS[runningStages[0]?.lineCode] || "#009255" }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
          <Train className="w-4 h-4 text-emerald-400 group-hover/gmap:scale-110 transition-transform" />
          <span>직관적 노선 경로 그래픽맵</span>
          {onMapClick && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-normal opacity-80 group-hover/gmap:opacity-100 transition-opacity ml-1.5 animate-pulse">
              터치 시 상세 지도로 이동 ↗
            </span>
          )}
        </h4>
        <span className="text-[9px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
          {hasTransfers ? `환승 ${runningStages.length - 1}회` : "직통 (환승 없음)"}
        </span>
      </div>

      {/* Graphical SVG Line Route Track */}
      <div className="relative py-4 select-none px-2 bg-black/30 rounded-xl border border-white/5 shadow-inner">
        {/* Dynamic Horizontal Line Drawing */}
        <div className="flex items-center justify-between relative w-full h-12">
          
          {/* Connector Tracks */}
          <div className="absolute top-1/2 left-4 right-4 h-1.5 -translate-y-1/2 rounded-full overflow-hidden flex">
            {runningStages.map((stage, idx) => {
              const prevWidth = idx === 0 ? "0%" : `${100 / runningStages.length}%`;
              return (
                <div 
                  key={idx} 
                  className="h-full transition-all duration-300" 
                  style={{ 
                    backgroundColor: stage.color, 
                    width: `${100 / runningStages.length}%` 
                  }} 
                />
              );
            })}
          </div>

          {/* Node 1: Start Station */}
          <div className="flex flex-col items-center justify-center z-10 shrink-0 w-16 relative">
            <span className="absolute -top-6 text-[10px] font-extrabold text-white max-w-[64px] text-center truncate">
              {route.startStationName}
            </span>
            <div 
              className="w-5 h-5 rounded-full bg-[#0E0E11] border-4 flex items-center justify-center transition-transform hover:scale-125 shadow-lg relative"
              style={{ borderColor: runningStages[0]?.color || "#009255" }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-ping absolute"
                style={{ backgroundColor: runningStages[0]?.color }}
              />
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: runningStages[0]?.color }}
              />
            </div>
            <span className="text-[8px] font-bold text-slate-500 mt-1 font-mono">
              {runningStages[0]?.lineName}
            </span>
          </div>

          {/* Transfer Station Node(s) */}
          {runningStages.slice(0, -1).map((stage, idx) => {
            const nextStage = runningStages[idx + 1];
            return (
              <div key={idx} className="flex flex-col items-center justify-center z-10 shrink-0 w-16 relative">
                <span className="absolute -top-6 text-[10px] font-extrabold text-indigo-300 max-w-[64px] text-center truncate">
                  {stage.endName}
                </span>
                <div 
                  className="w-6 h-6 rounded-full bg-[#0E0E11] border-2 flex items-center justify-center transition-transform hover:scale-125 shadow-lg"
                  style={{ 
                    borderTopColor: stage.color,
                    borderRightColor: nextStage?.color,
                    borderBottomColor: stage.color,
                    borderLeftColor: nextStage?.color,
                  }}
                >
                  <ArrowRightLeft className="w-2.5 h-2.5 text-white animate-pulse" />
                </div>
                <span className="text-[8px] font-bold text-indigo-400 mt-1 font-mono">
                  환승역
                </span>
              </div>
            );
          })}

          {/* Node N: End Station */}
          <div className="flex flex-col items-center justify-center z-10 shrink-0 w-16 relative">
            <span className="absolute -top-6 text-[10px] font-extrabold text-white max-w-[64px] text-center truncate">
              {route.endStationName}
            </span>
            <div 
              className="w-5 h-5 rounded-full bg-[#0E0E11] border-4 flex items-center justify-center transition-transform hover:scale-125 shadow-lg"
              style={{ borderColor: runningStages[runningStages.length - 1]?.color || "#009255" }}
            >
              <MapPin className="w-2.5 h-2.5 text-rose-500 fill-current" />
            </div>
            <span className="text-[8px] font-bold text-slate-500 mt-1 font-mono">
              {runningStages[runningStages.length - 1]?.lineName}
            </span>
          </div>

        </div>
      </div>

      {/* Segment Line Stop breakdown */}
      <div className="space-y-2.5 pt-1">
        {runningStages.map((stage, idx) => (
          <div key={idx} className="bg-[#1C1C22]/60 rounded-xl p-3 border border-white/5 space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="font-extrabold text-white">{stage.lineName}</span>
                <span className="text-[10px] text-slate-400">({stage.startName}역 → {stage.endName}역)</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStopsIndex(showStopsIndex === idx ? null : idx);
                }}
                className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10"
              >
                {stage.stopCount > 0 ? `${stage.stopCount}개역 경유 ${showStopsIndex === idx ? "접기▲" : "상세▼"}` : "직전정차"}
              </button>
            </div>

            {/* Expandable stops sequence card */}
            {showStopsIndex === idx && stage.stopList.length > 0 && (
              <div className="p-2.5 bg-black/40 rounded-lg text-[10px] text-slate-400 space-y-1 animate-fadeIn border border-white/5">
                <div className="font-bold text-slate-500 mb-1">순차 정차역 리스트:</div>
                <div className="flex flex-wrap items-center gap-1 font-mono">
                  <span className="text-white font-semibold">{stage.startName}</span>
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                  {stage.stopList.map((st, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <span className="text-slate-300">{st}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                    </React.Fragment>
                  ))}
                  <span className="text-white font-semibold">{stage.endName}</span>
                </div>
              </div>
            )}
            
            {showStopsIndex === idx && stage.stopList.length === 0 && (
              <div className="p-2 bg-black/40 rounded-lg text-[10px] text-slate-500">
                두 역이 바로 인접해 있습니다. 정차 점수 시그널에 따라 고속 경유합니다.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary statistics bar */}
      <div className="grid grid-cols-3 bg-black/25 rounded-xl border border-white/5 divide-x divide-white/5 text-center py-2.5 text-[11px] text-slate-300 font-mono">
        <div>
          <p className="text-slate-500 text-[9px] mb-0.5">총 소요 시간</p>
          <strong className="text-emerald-400 text-xs">{route.totalDurationMin}분</strong>
        </div>
        <div>
          <p className="text-slate-500 text-[9px] mb-0.5">전체 이동 거리</p>
          <strong className="text-white">{(route.totalDistanceMeter / 1000).toFixed(1)}km</strong>
        </div>
        <div>
          <p className="text-slate-500 text-[9px] mb-0.5">최적 요금</p>
          <strong className="text-slate-200">{route.fare.toLocaleString()}원</strong>
        </div>
      </div>
    </div>
  );
}
