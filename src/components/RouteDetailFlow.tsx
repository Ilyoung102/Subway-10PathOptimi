/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SubwayRoute, RouteSegment } from "../types";
import { 
  ArrowRight, Navigation, CheckCircle2, ChevronDown, ChevronUp, MapPin, 
  Accessibility, AlertTriangle, ArrowRightLeft, Landmark, Info, 
  Flame, ChevronRight, CornerDownRight, Footprints
} from "lucide-react";
import RouteGraphicMap from "./RouteGraphicMap";

interface RouteDetailFlowProps {
  route: SubwayRoute;
  onGraphicClick?: () => void;
}

export default function RouteDetailFlow({ route, onGraphicClick }: RouteDetailFlowProps) {
  const [expandedSegmentIdx, setExpandedSegmentIdx] = useState<number[]>(
    route.segments.map((_, i) => i) // Default expand all for scannability
  );

  const toggleExpand = (idx: number) => {
    if (expandedSegmentIdx.includes(idx)) {
      setExpandedSegmentIdx(prev => prev.filter(i => i !== idx));
    } else {
      setExpandedSegmentIdx(prev => [...prev, idx]);
    }
  };

  // Helper to draw realistic Korean train car door indicator (10 cars system)
  const renderTrainDiagram = (recommendCar?: number, recommendDoor?: number, reasonText?: string) => {
    if (!recommendCar) return null;

    return (
      <div className="bg-[#0A0A0B] text-slate-100 rounded-2xl p-4 my-3 text-xs border border-white/10 shadow-inner relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            최단 동선 탑승 위치: {recommendCar}호차 {recommendDoor || "전체"}번 문
          </span>
          <span className="font-mono text-[9px] text-slate-500">10칸 정형 열차 기준</span>
        </div>

        {/* Visual train diagram */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {Array.from({ length: 10 }).map((_, idx) => {
            const carNum = idx + 1;
            const isTarget = carNum === recommendCar;

            return (
              <div
                key={carNum}
                className={`flex-1 min-w-[34px] h-12 rounded-lg flex flex-col items-center justify-between p-1 transition-all border ${
                  isTarget
                    ? "bg-emerald-500 text-black border-emerald-500 font-extrabold scale-110 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 text-slate-500 border-white/5"
                }`}
              >
                <span className="text-[8px] font-mono leading-none">#{carNum}</span>
                <span className="text-xs">{isTarget ? "★" : "전동"}</span>
                <span className="text-[7px] leading-none opacity-80">{isTarget ? `${recommendDoor}번문` : "일반"}</span>
              </div>
            );
          })}
        </div>

        {/* Facilities near layout details */}
        <div className="mt-3 bg-white/5 rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              {reasonText || "이 문에서 내리면 환승 통로 계단 및 대합실로 다이렉트 도킹되어 이동선이 비약적으로 최소화됩니다."}
            </p>
            {recommendCar === 7 && recommendDoor === 2 && (
              <p className="text-[9px] text-emerald-400 mt-1 font-semibold">
                ▶ 사당역 4호선 환승통로 에스컬레이터 바로 정렬
              </p>
            )}
            {recommendCar === 3 && recommendDoor === 4 && (
              <p className="text-[9px] text-emerald-400 mt-1 font-semibold">
                ▶ 서울역 1호선 지하 환승 통로 입구 바로 정렬
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case "BOARDING":
        return <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-bold font-mono border border-emerald-500">승</div>;
      case "TRANSFER":
        return <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono border border-white/5">환</div>;
      case "ALIGHTING":
        return <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono border border-white/5">하</div>;
      default:
        return <div className="w-4 h-4 rounded-full bg-slate-800 border border-white/5" />;
    }
  };

  const getLineColorStyle = (lineCode?: string) => {
    switch (lineCode) {
      case "1": return "bg-[#0052A4]";
      case "2": return "bg-[#009255]";
      case "3": return "bg-[#EF7C1C]";
      case "4": return "bg-[#00A5DE]";
      case "DX": return "bg-[#D4003B]";
      case "K": return "bg-[#77C4A3]";
      case "SB": return "bg-[#F5A200]";
      default: return "bg-slate-500";
    }
  };

  return (
    <div id="route-detail-flow-container" className="bg-[#111114] rounded-2xl border border-white/10 p-4 mb-4">
      <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-white text-sm flex items-center gap-1">
            <Navigation className="w-4 h-4 text-emerald-500" />
            스마트 승하차 맞춤 상세 동선
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">역 개찰구 진입부터 열차 탈 때와 내릴 출구까지 올인원 가이드</p>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-bold">
          총 {route.totalDurationMin}분 코스
        </span>
      </div>

      {/* Graphical Route Map Visualizer */}
      <div className="mb-5">
        <RouteGraphicMap route={route} onMapClick={onGraphicClick} />
      </div>

      {/* 1. 도보 연결 입구 진입 가이드 */}
      <div className="relative pl-7 pb-4">
        <div className="absolute left-2.5 top-1.5 bottom-0 w-0.5 bg-white/10 border-dashed" />
        <div className="absolute left-1 top-1">
          <Footprints className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-slate-200">{route.startStationName}역 개찰구로 진입</span>
          <span className="text-slate-500 text-[10px]">(도보 약 2분 소요)</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">목적지 개찰 요금 태그 후 {route.segments[0]?.lineName || "지하철"} 승강장 표지판을 따라 이동하세요.</p>
      </div>

      {/* 2. 단계별 동선 플로우 루프 */}
      <div className="space-y-4">
        {route.segments.map((segment, idx) => {
          const isExpanded = expandedSegmentIdx.includes(idx);
          const hasDetails = segment.type !== "RUNNING";

          return (
            <div
              id={`segment-flow-block-${idx}`}
              key={idx}
              className="relative pl-7 group"
            >
              {/* Line Connector */}
              {idx < route.segments.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-white/10 group-hover:bg-[#1C1C21] transition-all" />
              )}

              {/* Node Bullet */}
              <div className="absolute left-0 top-0.5 z-10 bg-[#111114] transition-all">
                {getSegmentIcon(segment.type)}
              </div>

              {/* Header Box */}
              <div className="flex items-start justify-between">
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-white text-md">
                      {segment.stationName}역
                    </span>
                    {segment.lineName && (
                      <span className={`text-[9px] text-white font-bold px-1.5 py-0.5 rounded ${getLineColorStyle(segment.lineCode)}`}>
                        {segment.lineName}
                      </span>
                    )}

                    {segment.type === "BOARDING" && (
                      <span className="text-[10px] bg-white/5 text-slate-300 px-1.5 py-0.5 rounded font-semibold border border-white/5">
                        승차 대기
                      </span>
                    )}
                    {segment.type === "TRANSFER" && (
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-semibold border border-indigo-500/25">
                        환승 연계
                      </span>
                    )}
                    {segment.type === "ALIGHTING" && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/25">
                        하차 출영
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                    {segment.directionName && (
                      <>
                        <span className="text-emerald-400 font-bold">▶ {segment.directionName}</span>
                        <span>행선 전동차 탑승</span>
                      </>
                    )}
                    {!segment.directionName && segment.type === "RUNNING" && (
                      <span>이동구간: {segment.stopStationsCount}개 역 경료 ({segment.durationMin}분 소요)</span>
                    )}
                  </p>
                </div>

                {hasDetails && (
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Expand Details Body */}
              {isExpanded && hasDetails && (
                <div className="mt-2 bg-[#1C1C21] p-3 rounded-xl border border-white/5 text-[11px] transition-all">
                  {segment.type === "BOARDING" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white">1단계 : </span>
                        <span className="text-slate-300">전철 탑승을 대기할 때 아래 추천 위치의 번호문 바닥 스티커를 찾아 정렬하세요.</span>
                      </div>
                      {renderTrainDiagram(segment.recommendCarNum, segment.recommendDoorNum, segment.recommendReason)}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                        <span>이동 시설 : {segment.facilityPath?.join(" → ")}</span>
                        <span>•</span>
                        <span>휠체어 슬로프 : {segment.accessibilityInfo || "일반 보도"}</span>
                      </div>
                    </div>
                  )}

                  {segment.type === "TRANSFER" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-slate-300">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>내리자마자 바로 앞에 환승 통로 연결 계단/에스컬레이터가 나타납니다.</span>
                      </div>
                      {renderTrainDiagram(segment.recommendCarNum, segment.recommendDoorNum, segment.recommendReason)}
                      <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 rounded-lg text-[10px] flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
                        <span>환승 통로 도보 약 <strong>{segment.distanceMeter}m</strong>, 쾌적 통과 가능</span>
                      </div>
                    </div>
                  )}

                  {segment.type === "ALIGHTING" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>최종 하차 후 사용 목적지와 가장 가까운 출구 및 연결통로로 직행하는 문입니다.</span>
                      </div>
                      
                      {renderTrainDiagram(segment.recommendCarNum, segment.recommendDoorNum, segment.recommendReason)}

                      <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-lg p-2.5 space-y-1 text-emerald-400">
                        <div className="font-semibold text-[10px]">목적지 인근 출구 추천 가이드:</div>
                        {route.endStationName === "서울역" && (
                          <div className="text-[9px] leading-relaxed text-slate-400">
                            · KTX/일반철도 및 공항철도 매표소 타겟 → <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">1번 출구</strong> 바로 연계<br/>
                            · 서울스퀘어 빌딩 및 남산공원 방면 → <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">8번 출구</strong> 이용<br/>
                            · 서부 극단 및 만리동 방면 → <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">15번 서부 출구</strong> 이용 권장
                          </div>
                        )}
                        {route.endStationName === "이촌" && (
                          <div className="text-[9px] leading-relaxed text-slate-400">
                            · 국립중앙박물관 기획전시실 및 상설전시장 → <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">2번 출구 연결 지하보도</strong>로 우산 없이 진입
                          </div>
                        )}
                        {route.endStationName === "강남" && (
                          <div className="text-[9px] leading-relaxed text-slate-400">
                            · 카카오프렌즈 마켓 및 신논현 방면 먹자골목 → <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">11번 출구</strong> 및 <strong className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">10번 출구</strong> 도보 최단
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Running summary (only if segment is running to show pass locations) */}
              {segment.type === "RUNNING" && segment.stopStationsList && (
                <div className="mt-1 pl-4 border-l-2 border-white/5 py-1 text-[10px] text-slate-500 space-y-0.5">
                  <div className="font-semibold text-slate-600">경유하는 정차 역 ({segment.stopStationsCount}개 역) :</div>
                  <div className="flex items-center gap-1 flex-wrap font-mono">
                    {segment.stopStationsList.map((stop, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span>{stop}</span>
                        {sIdx < segment.stopStationsList!.length - 1 && <ChevronRight className="w-2.5 h-2.5 shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. 최종 출구 탈출 후 도착 완료 */}
      <div className="relative pl-7 pt-2 border-t border-white/5 mt-4">
        <div className="absolute left-1.5 top-3 z-10 text-rose-500 animate-pulse">
          <MapPin className="w-5 h-5 fill-current" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-extrabold text-white text-xs">최종 하차 후 목적지 도착</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">환영합니다! 역내 스마트 동선을 준수하여 승강장 하차부터 목적지 광장 통과까지 최소 동선(도보 절약 최대 약 15분)으로 도착을 촉진했습니다.</p>
      </div>
    </div>
  );
}
