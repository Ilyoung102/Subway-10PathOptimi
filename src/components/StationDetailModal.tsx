/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Station, SubwayExit, DoorDetail } from "../types";
import { X, MapPin, Compass, Landmark, Accessibility, ShieldAlert, Sparkles } from "lucide-react";

interface StationDetailModalProps {
  station: Station;
  exits: SubwayExit[];
  doors: DoorDetail[];
  onClose: () => void;
}

export default function StationDetailModal({ station, exits, doors, onClose }: StationDetailModalProps) {
  // Categorize exits with and without lift
  const accessibleExits = exits.filter(e => e.hasElevator || e.hasEscalator);
  const normalExits = exits.filter(e => !e.hasElevator && !e.hasEscalator);

  // Platform properties matching
  const isIsland = station.name === "사당" || station.name === "시청"; // Island: 섬식, Side: 상대식
  const toiletPosition = station.name === "사당" 
    ? "개찰구 내부 (2, 4호선 환승 통로 하단에 위치)" 
    : station.name === "서울역" 
      ? "개찰구 외부 (1번 출구 대합실 대광장 롯데마트 방면 입구)" 
      : "개찰구 내부 쪽에 통합 설치 운영중";

  return (
    <div id="station-detail-backdrop" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div
        id="station-detail-modal-body"
        className="w-full sm:max-w-md bg-[#111114] rounded-t-3xl sm:rounded-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl border border-white/10 flex flex-col justify-between"
      >
        {/* Header Block with Line Code background */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111114] z-10">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              station.lineCode === "2" ? "bg-[#009255]" : station.lineCode === "4" ? "bg-[#00A5DE]" : "bg-[#0052A4]"
            }`} />
            <div>
              <h3 className="font-extrabold text-white text-base">{station.name}역 상세 시설 정보</h3>
              <p className="text-[10px] text-slate-500 font-mono">CODE: {station.stationCode} • {station.lineName}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-[#1C1C21] border border-white/5 rounded-xl">
              <div className="text-slate-500 text-[9px] font-bold">플랫폼 구조</div>
              <div className="font-extrabold text-white mt-1">{isIsland ? "섬식 (양쪽 문 열림)" : "상대식 (반대편 횡단 불가능)"}</div>
            </div>
            <div className="p-3 bg-[#1C1C21] border border-white/5 rounded-xl">
              <div className="text-slate-500 text-[9px] font-bold">화장실 위치</div>
              <div className="font-extrabold text-slate-300 mt-1 select-all leading-normal">{toiletPosition}</div>
            </div>
          </div>

          {/* Door suggestions detail cards */}
          <div>
            <h4 className="font-extrabold text-xs text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/20" />
              추천 하차문 세부 요약 ({doors.length}곳 보유)
            </h4>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {doors.map((door, dIdx) => (
                <div key={dIdx} className="bg-[#1C1C21] p-2 border border-white/5 rounded-xl text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-400 bg-white/5 border border-white/5 shadow-sm px-1.5 py-0.5 rounded text-[10px]">
                      {door.carNumber}-{door.doorNumber} 문
                    </span>
                    <span className="text-[#A0A0AB] font-medium">연계: {door.nearFacilities.map(f => {
                      if (f.startsWith("TRANSFER")) return "환승 통로";
                      if (f.startsWith("EXIT")) return `${f.replace("EXIT_", "")}번 출구`;
                      if (f === "ELEVATOR") return "휠체어 엘리베이터";
                      if (f === "ESCALATOR") return "에스컬레이터";
                      return f;
                    }).join(", ")}</span>
                  </div>
                  {door.wheelchairPosition && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#F43F5E] bg-rose-500/10 border border-[#F43F5E]/20 rounded px-1 py-0.5">
                      <Accessibility className="w-2.5 h-2.5" />
                      휠체어 전용 발판
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Exit Information detail mapped */}
          <div>
            <h4 className="font-extrabold text-xs text-white mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              출구별 인근 정보 / 주변 연계 장소 ({exits.length}곳)
            </h4>
            
            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 p-2.5 rounded-xl">
                <div className="text-[10px] font-extrabold flex items-center gap-1">
                  <Accessibility className="w-3 h-3" />
                  무장애 교통약자 전용 출구 가이드:
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {accessibleExits.length > 0 
                    ? `${accessibleExits.map(e => `${e.exitNumber}번(${e.hasElevator ? "E/V" : "E/S"})`).join(", ")} 출구는 계단 오르내림이 영구 차단된 배리어프리 출구입니다.`
                    : "이 역은 엘리베이터 출구가 협소하므로 역무원 호출 벨 가동을 권장합니다."}
                </div>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {exits.map((ex, exIdx) => (
                  <div key={exIdx} className="p-2.5 bg-[#1C1C21] rounded-xl text-[11px] border border-white/5 leading-normal">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-white flex items-center gap-1">
                        <Compass className="w-3 h-3 text-emerald-500" />
                        {ex.exitNumber}번 출구
                      </span>
                      <div className="flex gap-1">
                        {ex.hasElevator && (
                          <span className="bg-sky-500/10 text-sky-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-sky-500/20">
                            엘리베이터 우수
                          </span>
                        )}
                        {ex.hasEscalator && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20">
                            에스컬레이터
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-400 font-medium">
                      인근 시설: {ex.nearbyPlaces.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info message */}
        <div className="p-4 bg-[#0B0B0C] border-t border-white/5 text-[10px] text-slate-500 select-all flex items-center gap-1.5 leading-normal">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>잘못된 승하차 출구 번호나 화장실 위치를 발견하셨나요? 언제든지 제보 마켓을 통해 전파해 주세요!</span>
        </div>
      </div>
    </div>
  );
}
