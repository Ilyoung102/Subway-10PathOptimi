/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { RealtimeArrival } from "../types";
import { Radio, AlertTriangle, RefreshCw, Compass, ShieldAlert, Sparkles } from "lucide-react";

interface SubwayRealtimeViewProps {
  stationName: string;
}

export default function SubwayRealtimeView({ stationName }: SubwayRealtimeViewProps) {
  const [arrivals, setArrivals] = useState<RealtimeArrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchRealtime = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/subway/realtime?stationName=${encodeURIComponent(stationName)}`);
        const data = await resp.json();
        if (active && data.arrivals) {
          setArrivals(data.arrivals);
        }
      } catch (err) {
        console.error("Failed to load realtime arrivals", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRealtime();

    // Auto refresh every 30 seconds for dynamic realism
    const interval = setInterval(() => {
      fetchRealtime();
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stationName, refreshTrigger]);

  const getCrowdBadgeStyle = (lvl: 1 | 2 | 3 | 4) => {
    switch (lvl) {
      case 1: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case 2: return "bg-[#00A5DE]/10 text-sky-400 border-[#00A5DE]/25";
      case 3: return "bg-amber-550/10 bg-amber-500/10 text-amber-400 border-amber-500/25";
      case 4: return "bg-red-500/10 text-red-400 border-red-500/25 animate-pulse";
    }
  };

  const getCrowdText = (lvl: 1 | 2 | 3 | 4) => {
    switch (lvl) {
      case 1: return "● 여유 (의자 자리 넉넉)";
      case 2: return "● 보통 (일부 입석 발생)";
      case 3: return "● 주의 (어깨 밀착 위험)";
      case 4: return "● 과포화 (한 대 뒤 권장)";
    }
  };

  const formatTime = (sec: number) => {
    if (sec <= 0) return "진입 중";
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return min > 0 ? `${min}분 ${s}초 후` : `${s}초 후`;
  };

  return (
    <div id="subway-realtime-view-card" className="bg-[#111114] rounded-2xl border border-white/10 p-4 mb-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <h3 className="font-extrabold text-white text-sm">
            {stationName}역 실시간 전동차 도착 현황
          </h3>
        </div>
        
        <button
          id="btn-refresh-realtime-arrivals"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
          className="p-1 px-2 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold border border-white/10 rounded-lg flex items-center gap-1 hover:text-white transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          수동 새로고침
        </button>
      </div>

      {loading && arrivals.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">실시간 관제 신호를 수신 중입니다...</div>
      ) : arrivals.length === 0 ? (
        <div className="text-center py-5 border border-white/5 bg-white/5 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-slate-500 mx-auto mb-1" />
          <p className="text-xs text-slate-400">조회 가능한 실시간 열차 신호가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {arrivals.map((arr, index) => {
            const isLine2 = arr.lineCode === "2";
            const borderAccent = isLine2 ? "border-l-4 border-l-[#009255]" : "border-l-4 border-[#00A5DE]";

            return (
              <div
                id={`realtime-arrival-item-${index}`}
                key={index}
                className={`p-3 bg-[#1C1C21] border border-white/5 rounded-xl flex flex-col justify-between ${borderAccent} transition-all hover:bg-white/5`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLine2 ? "bg-[#009255]" : "bg-[#00A5DE]"}`} />
                    <span className="font-extrabold text-slate-200 text-xs">
                      {arr.lineName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      ({arr.direction === "당고개행" ? "서울역방면" : arr.direction})
                    </span>
                  </div>

                  {arr.isExpress && (
                    <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded animate-pulse">
                      급행
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-xs">
                    <div className="font-extrabold text-emerald-400 text-md tracking-tight">
                      {arr.msg}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      남은 시간: {formatTime(arr.arrivalTimeSec)}
                    </div>
                  </div>

                  {/* Crowd estimate meter */}
                  <div className={`p-1.5 px-2.5 border rounded-lg text-[9px] font-bold ${getCrowdBadgeStyle(arr.crowdLvl)}`}>
                    <div className="opacity-80 scale-90 mb-0.5 uppercase tracking-wider text-center text-[8px]">혼잡 정보</div>
                    <div>{getCrowdText(arr.crowdLvl)}</div>
                  </div>
                </div>

                {arr.crowdLvl >= 3 && (
                  <div className="mt-2 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>혼잡도가 지대합니다. 사당 환승 계단 멀리 떨어진 2번째, 9번째 차량 탑승을 강권합니다.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] text-slate-500 text-right mt-2 flex items-center justify-end gap-1">
        <Sparkles className="w-2.5 h-2.5 text-slate-500" />
        지하철 열차 혼잡 정보는 서울교통공사 실시간 통계 기반 추정 가중치와 융합되었습니다.
      </p>
    </div>
  );
}
