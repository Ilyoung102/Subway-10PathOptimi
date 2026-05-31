/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Station, SubwayExit, DoorDetail, SubwayRoute, TransitMode, SearchItem } from "./types";
import { STATIONS, EXITS, DOOR_DETAILS, SEARCH_PLACES, getRealtimeArrivals, resolveStation, findRoutes } from "./subwayData";

// Components
import MainSearch from "./components/MainSearch";
import VulnerableWidget from "./components/VulnerableWidget";
import RouteResultList from "./components/RouteResultList";
import RouteDetailFlow from "./components/RouteDetailFlow";
import SubwayRealtimeView from "./components/SubwayRealtimeView";
import StationDetailModal from "./components/StationDetailModal";
import CrowdReportingBox from "./components/CrowdReportingBox";
import SubwayInteractiveMap from "./components/SubwayInteractiveMap";

// Lucide-icons
import { 
  Compass, Map, Info, AlertTriangle, ShieldCheck, Accessibility, 
  Sparkles, Train, HelpCircle, HelpCircle as HelpIcon, ArrowRight, CornerDownRight, Footprints
} from "lucide-react";

export default function App() {
  // Global domain data mapping
  const [stations, setStations] = useState<Station[]>(STATIONS);
  const [searchItems, setSearchItems] = useState<SearchItem[]>(SEARCH_PLACES);

  // Intent / Query selections
  const [startStation, setStartStation] = useState<SearchItem | null>(null);
  const [endStation, setEndStation] = useState<SearchItem | null>(null);
  const [transitMode, setTransitMode] = useState<TransitMode>("FASTEST");

  // Router Outputs
  const [routes, setRoutes] = useState<SubwayRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SubwayRoute | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Station view modal Layer
  const [selectedStationInfo, setSelectedStationInfo] = useState<Station | null>(null);
  
  // Tab control (routes VS map view)
  const [activeTab, setActiveTab] = useState<"SEARCH" | "MAP_VIEW" | "REPORTS">("SEARCH");

  // Direct station node hover status for interactive maps
  const [hoveredStationName, setHoveredStationName] = useState<string | null>(null);

  // Trigger search route calculation on fetch matching API
  const handleCalculateRoutes = async (from: SearchItem, to: SearchItem, mode: TransitMode = transitMode, exitNumber?: string) => {
    // Locate correct stationIds
    let fromId = from.stationId;
    let toId = to.stationId;

    let matchedFrom = STATIONS.find(s => s.id === fromId);
    if (!matchedFrom) {
      let cleanFromName = (from.name || "").replace("역", "").trim();
      if (cleanFromName.includes("(")) {
        cleanFromName = cleanFromName.split("(")[0].trim();
      }
      matchedFrom = STATIONS.find(s => s.name === cleanFromName);
      if (!matchedFrom) {
        matchedFrom = STATIONS.find(s => s.name.startsWith(cleanFromName) || cleanFromName.startsWith(s.name));
      }
    }

    let matchedTo = STATIONS.find(s => s.id === toId);
    if (!matchedTo) {
      let cleanToName = (to.name || "").replace("역", "").trim();
      if (cleanToName.includes("(")) {
        cleanToName = cleanToName.split("(")[0].trim();
      }
      matchedTo = STATIONS.find(s => s.name === cleanToName);
      if (!matchedTo) {
        matchedTo = STATIONS.find(s => s.name.startsWith(cleanToName) || cleanToName.startsWith(s.name));
      }
    }

    const formatNameWithStation = (rawName: string) => {
      let clean = (rawName || "").split("(")[0].trim();
      return clean.endsWith("역") ? clean : `${clean}역`;
    };

    if (!matchedFrom) {
      setIsSearching(false);
      setSearchError(`출발지 '${formatNameWithStation(from.name)}'은 노선도에서 검색이 불가능한 역명입니다. 철자법 또는 수도권 노선을 가리키는지 다시 확인해 주세요.`);
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    if (!matchedTo) {
      setIsSearching(false);
      setSearchError(`도착지 '${formatNameWithStation(to.name)}'은 노선도에서 검색이 불가능한 역명입니다. 철자법 또는 수도권 노선을 가리키는지 다시 확인해 주세요.`);
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    if (matchedFrom.name === matchedTo.name) {
      setIsSearching(false);
      setSearchError("출발지(역)와 목적지(역)가 동일합니다. 서로 다른 명칭의 역을 지정해 주세요.");
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    fromId = matchedFrom.id;
    toId = matchedTo.id;

    setIsSearching(true);
    setSearchError("");
    setSelectedRoute(null);
    setStartStation(from);
    setEndStation(to);

    try {
      const resp = await fetch(`/api/subway/route?from=${fromId}&to=${toId}&mode=${mode}&exit=${exitNumber || ""}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.routes) {
          setRoutes(data.routes);
          if (data.routes.length > 0) {
            setSelectedRoute(data.routes[0]); // default select primary match
          }
          return;
        }
      }
      throw new Error("HTTP response or routes data is invalid");
    } catch (err) {
      console.warn("Routing API fetch failed, activating fallback routing algorithm locally...", err);
      try {
        const localRoutes = findRoutes(fromId, toId, mode, exitNumber);
        if (localRoutes && localRoutes.length > 0) {
          setRoutes(localRoutes);
          setSelectedRoute(localRoutes[0]);
        } else {
          setSearchError("경로 탐색 기준에 매칭되는 철도 노선을 탐색하지 못했습니다.");
        }
      } catch (fallbackErr) {
        console.error("Local client-side routing fallback failed", fallbackErr);
        setSearchError("경로 계산 및 연산 탐색 과정 도중 사소한 오류가 발생했습니다.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Directly select start / end from custom SVG Subway Map Click
  const handleMapStationSelect = (station: Station, role?: "START" | "END") => {
    const sItem: SearchItem = {
      name: `${station.name}역`,
      type: "STATION",
      stationId: station.id,
      lat: station.lat,
      lng: station.lng,
      lineNames: [station.lineName]
    };

    if (role === "START") {
      setStartStation(sItem);
      if (endStation && sItem.stationId === endStation.stationId) {
        setEndStation(null);
        setRoutes([]);
        setSelectedRoute(null);
      } else if (endStation) {
        handleCalculateRoutes(sItem, endStation, transitMode);
      }
    } else if (role === "END") {
      if (startStation && startStation.stationId === sItem.stationId) {
        setStartStation(null);
      }
      setEndStation(sItem);
      if (startStation && startStation.stationId !== sItem.stationId) {
        handleCalculateRoutes(startStation, sItem, transitMode);
      }
    } else {
      if (!startStation) {
        setStartStation(sItem);
      } else if (!endStation && startStation.stationId !== sItem.stationId) {
        setEndStation(sItem);
        // Auto trigger route
        handleCalculateRoutes(startStation, sItem, transitMode);
      } else {
        // replace start, empty end
        setStartStation(sItem);
        setEndStation(null);
        setRoutes([]);
        setSelectedRoute(null);
      }
    }
  };

  const handleResetSearch = () => {
    setStartStation(null);
    setEndStation(null);
    setRoutes([]);
    setSelectedRoute(null);
  };

  // Quick detail modal openers
  const openStationInfoModal = (stationName: string) => {
    const match = STATIONS.find(s => s.name.includes(stationName) || stationName.includes(s.name));
    if (match) {
      setSelectedStationInfo(match);
    } else {
      const cleanName = stationName.replace("역", "");
      setSelectedStationInfo({
        id: `DYNAMIC_${cleanName}`,
        name: cleanName,
        lineCode: "2",
        lineName: "통합선",
        lat: 37.5657,
        lng: 126.9769,
        stationCode: "999"
      });
    }
  };

  return (
    <div id="subway-routing-applet" className="min-h-screen bg-[#070709] flex flex-col justify-between text-slate-100 font-sans antialiased pb-12 sm:pb-4">
      
      {/* Upper Navigation Header bar */}
      <header className="bg-[#111114]/90 backdrop-blur-md text-white border-b border-white/5 sticky top-0 z-40 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 bg-emerald-500 rounded-lg text-black font-black text-xs animate-pulse">
              <Train className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight">지하철 최적 승하차 가이드</h1>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">환승·하차·출구 최단거리 문번호 자동 가중치 계산</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            v1.2.0 Real-time
          </span>
        </div>
      </header>

      {/* Main Container constrained for mobile first layout structure */}
      <main className="flex-1 max-w-md w-full mx-auto px-3 py-3 space-y-4">
        
        {/* Navigation Tabs (Search, Visual Map, Reports) */}
        <div id="subway-layout-tabs" className="grid grid-cols-3 bg-[#111114] p-1 rounded-2xl border border-white/5 shadow-md">
          <button
            onClick={() => setActiveTab("SEARCH")}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "SEARCH" ? "bg-[#1C1C21] text-emerald-400 border border-white/5 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            대용량 길찾기
          </button>
          <button
            onClick={() => setActiveTab("MAP_VIEW")}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "MAP_VIEW" ? "bg-[#1C1C21] text-emerald-400 border border-white/5 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            노선도 클릭승차
          </button>
          <button
            onClick={() => setActiveTab("REPORTS")}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "REPORTS" ? "bg-[#1C1C21] text-emerald-400 border border-white/5 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            시민 실시간제보통
          </button>
        </div>

        {/* Tab 1: Search & Path Recommendations */}
        {activeTab === "SEARCH" && (
          <div className="space-y-3">
            {/* Main Typo/AI search deck */}
            <MainSearch
              stationsList={searchItems}
              onSearchRoute={(from, to, mode, exitNumber) => {
                const targetMode = mode || transitMode;
                if (mode) setTransitMode(mode);
                handleCalculateRoutes(from, to, targetMode, exitNumber);
              }}
            />

            {/* Custom weights toggler */}
            <VulnerableWidget
              currentMode={transitMode}
              onChangeMode={(m) => {
                setTransitMode(m);
                if (startStation && endStation) {
                  handleCalculateRoutes(startStation, endStation, m);
                }
              }}
            />

            {/* Error alerts */}
            {searchError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Calculating spinner */}
            {isSearching && (
              <div className="p-8 text-center bg-[#111114] rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-3 shadow-lg">
                <span className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-300 font-semibold animate-pulse">지상/지하 역내 이동거리 최적화 경로 점수 계산 중...</span>
                <span className="text-[9px] text-slate-500">Dijkstra Weights: {transitMode} mode loaded.</span>
              </div>
            )}

            {/* Comparison cards list outputs */}
            {routes.length > 0 && !isSearching && (
              <RouteResultList
                routes={routes}
                selectedRouteId={selectedRoute?.id}
                onSelectRoute={(r) => setSelectedRoute(r)}
              />
            )}

            {/* Route Detail Visual Flow */}
            {selectedRoute && !isSearching && (
              <div className="space-y-3">
                {/* 직관적 노선 경로 그래픽맵 유도 배너 */}
                <div 
                  id="btn-shortcut-interactive-map"
                  onClick={() => setActiveTab("MAP_VIEW")}
                  className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/15 hover:to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/35 rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                      <Map className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white">직관적 노선 경로 그래픽맵 확인</h4>
                      <p className="text-[10px] text-slate-400">인터랙티브 노선 지도를 열어 전체 전철망 경로 표시 보기</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>

                <RouteDetailFlow route={selectedRoute} onGraphicClick={() => setActiveTab("MAP_VIEW")} />
                
                {/* Real-time details at current focus station */}
                <SubwayRealtimeView stationName={selectedRoute.startStationName} />

                {/* Direct quick button to open details */}
                <div className="p-4 bg-[#111114] rounded-2xl border border-white/10 shadow-md flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{selectedRoute.startStationName}역 전체 역내 지도 확인</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">화장실 개찰구 내부여부 및 엘리베이터 출구 종합</p>
                  </div>
                  <button
                    onClick={() => openStationInfoModal(selectedRoute.startStationName)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    시설보기
                  </button>
                </div>
              </div>
            )}

            {/* Reset button if route loaded */}
            {(startStation || endStation) && (
              <button
                id="btn-clear-search"
                onClick={handleResetSearch}
                className="w-full py-2 bg-[#111114] hover:bg-white/5 text-slate-400 border border-white/5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                검색 세션 초기화
              </button>
            )}

            {/* Standard Subway Helper Widget Info Card */}
            {!selectedRoute && !isSearching && (
              <div className="p-4 bg-[#111114] text-slate-100 rounded-3xl border border-emerald-500/10 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                  <Train className="w-28 h-28 text-white rotate-12" />
                </div>
                <h4 className="font-extrabold text-sm text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  스마트서브웨이 최고 존엄 꿀팁
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-light">
                  지하철 타기 전, 미리 <strong>추천 승하차 문 번호</strong> 앞에 줄을 서세요! 
                  내리자마자 바로 앞에 4호선 환승 계단이나 출구가 나타나, 출퇴근 혼잡 속에서 걷는 시간을 최대 12분까지 획기적으로 차단할 수 있습니다.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] bg-[#1C1C21] text-emerald-400 border border-emerald-500/15 font-bold px-2 py-0.5 rounded-full">사당역 7-2번 최단환승</span>
                  <span className="text-[9px] bg-[#1C1C21] text-emerald-400 border border-emerald-500/15 font-bold px-2 py-0.5 rounded-full">서울역 3-4번 출구직통</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: HTML Interactive Subway Map Node select */}
        {activeTab === "MAP_VIEW" && (
          <SubwayInteractiveMap
            startStation={startStation ? {
              id: startStation.stationId || "",
              name: startStation.name.replace("역", ""),
              lineCode: "",
              lineName: startStation.lineNames?.[0] || "",
              lat: startStation.lat || 0,
              lng: startStation.lng || 0,
              stationCode: ""
            } : null}
            endStation={endStation ? {
              id: endStation.stationId || "",
              name: endStation.name.replace("역", ""),
              lineCode: "",
              lineName: endStation.lineNames?.[0] || "",
              lat: endStation.lat || 0,
              lng: endStation.lng || 0,
              stationCode: ""
            } : null}
            activeRoute={selectedRoute}
            onSelectStation={(station, role) => handleMapStationSelect(station, role)}
            onReset={handleResetSearch}
            onShowStationDetails={openStationInfoModal}
            onSeeDetails={() => setActiveTab("SEARCH")}
          />
        )}

        {/* Tab 3: Reports & Crowd Sourcing signals map */}
        {activeTab === "REPORTS" && (
          <div className="space-y-3">
            <CrowdReportingBox />

            {/* Quick stats details of reporters info */}
            <div className="p-4 bg-[#111114] border border-white/10 text-slate-300 rounded-2xl text-[11px] leading-relaxed relative overflow-hidden shadow-lg">
              <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-emerald-500/10 rounded-full" />
              <h4 className="font-extrabold text-white flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                지하철 시민 제보 마켓 안내
              </h4>
              <p className="text-slate-400 mt-1">
                스마트서브웨이가 관리하는 시민 제보 현황은, 다른 사용자들에 의해 수시로 "도움 검증(UP)" 혹은 "오류 평가(DOWN)"를 받으며 신뢰도가 증감하는 <strong>크라우드 실시간 보정</strong> 방식입니다. 신뢰 점수(reliabilityScore)가 일정 단계 이하로 내려가면, 기동 엔진 알고리즘에 가해지던 우회 가중치 적용이 자동 무효화 처리됩니다.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Station detail slide sheet backdrop layer modal */}
      {selectedStationInfo && (
        <StationDetailModal
          station={selectedStationInfo}
          exits={EXITS.filter(e => e.stationId === selectedStationInfo.id)}
          doors={DOOR_DETAILS[selectedStationInfo.id] || []}
          onClose={() => setSelectedStationInfo(null)}
        />
      )}

      {/* Persistent global footer credits */}
      <footer className="w-full text-center py-4 bg-[#0B0B0C] text-slate-500 text-[10px] font-sans border-t border-white/5">
        <p>© 2026 Subway Optimal Boarding Navigation Inc.</p>
        <p className="mt-1">실시간 데이터 연동 시뮬레이션 가동 중 • AI Studio build</p>
      </footer>
    </div>
  );
}

