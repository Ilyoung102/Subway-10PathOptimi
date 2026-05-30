/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Station, SubwayExit, DoorDetail, SubwayRoute, TransitMode, SearchItem } from "./types";
import { STATIONS, EXITS, DOOR_DETAILS, SEARCH_PLACES, getRealtimeArrivals, resolveStation } from "./subwayData";

// Components
import MainSearch from "./components/MainSearch";
import VulnerableWidget from "./components/VulnerableWidget";
import RouteResultList from "./components/RouteResultList";
import RouteDetailFlow from "./components/RouteDetailFlow";
import SubwayRealtimeView from "./components/SubwayRealtimeView";
import StationDetailModal from "./components/StationDetailModal";
import CrowdReportingBox from "./components/CrowdReportingBox";

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

    if (!fromId) {
      const cleanFromName = from.name.replace("역", "").trim();
      let match = STATIONS.find(s => s.name === cleanFromName);
      if (!match) {
        match = STATIONS.find(s => s.name.startsWith(cleanFromName) || cleanFromName.startsWith(s.name));
      }
      fromId = match ? match.id : "205"; // fallback to 강남
    }
    if (!toId) {
      const cleanToName = to.name.replace("역", "").trim();
      let match = STATIONS.find(s => s.name === cleanToName);
      if (!match) {
        match = STATIONS.find(s => s.name.startsWith(cleanToName) || cleanToName.startsWith(s.name));
      }
      toId = match ? match.id : "401"; // fallback to 서울역
    }

    setIsSearching(true);
    setSearchError("");
    setSelectedRoute(null);
    setStartStation(from);
    setEndStation(to);

    try {
      const resp = await fetch(`/api/subway/route?from=${fromId}&to=${toId}&mode=${mode}&exit=${exitNumber || ""}`);
      const data = await resp.json();
      if (resp.ok && data.routes) {
        setRoutes(data.routes);
        if (data.routes.length > 0) {
          setSelectedRoute(data.routes[0]); // default select primary match
        }
      } else {
        setSearchError(data.error || "경로 탐색 요청이 반환 실패했습니다.");
      }
    } catch (err) {
      console.error("Routing error", err);
      setSearchError("로컬 경로 탐색 시뮬레이션 지연으로, 최단 결합 엔진을 기동합니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // Directly select start / end from custom SVG Subway Map Click
  const handleMapStationSelect = (station: Station) => {
    const sItem: SearchItem = {
      name: `${station.name}역`,
      type: "STATION",
      stationId: station.id,
      lat: station.lat,
      lng: station.lng,
      lineNames: [station.lineName]
    };

    if (!startStation) {
      setStartStation(sItem);
    } else if (!endStation && startStation.stationId !== sItem.stationId) {
      setEndStation(sItem);
      // Auto trigger route
      handleCalculateRoutes(startStation, sItem, transitMode);
      setActiveTab("SEARCH");
    } else {
      // replace start, empty end
      setStartStation(sItem);
      setEndStation(null);
      setRoutes([]);
      setSelectedRoute(null);
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
                <RouteDetailFlow route={selectedRoute} />
                
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
          <div className="bg-[#111114] border border-white/10 rounded-2xl shadow-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-emerald-500" />
                  클릭 스마트 통합 전천 노선망
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">역 노드를 터치하여 즉시 출발지와 목적지를 대입하세요.</p>
              </div>
              <Compass className="w-4 h-4 text-emerald-500 animate-spin" />
            </div>

            {/* Subway Status indicator selection header */}
            <div className="bg-[#1C1C21] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
              <div>
                Selected Start: <strong className="text-emerald-400 font-extrabold">{startStation?.name || "미지정"}</strong>
              </div>
              <div className="text-slate-500">→</div>
              <div>
                Selected Destination: <strong className="text-rose-450 text-[#F43F5E] font-extrabold">{endStation?.name || "미지정"}</strong>
              </div>
            </div>

            {/* Beautiful SVG Subway Map Scheme */}
            <div className="border border-white/5 rounded-2xl bg-[#09090B] p-2 overflow-hidden relative shadow-inner">
              
              {/* Overlay hover tag info */}
              {hoveredStationName && (
                <div className="absolute top-2 left-2 z-10 bg-[#111114]/95 text-slate-100 border border-emerald-500/20 rounded-lg p-1.5 px-2.5 text-[10px] shadow-md font-bold flex items-center gap-1 animate-fadeIn">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{hoveredStationName}역 (실시간 터치 선택)</span>
                </div>
              )}

              <svg 
                viewBox="50 40 400 320" 
                className="w-full h-auto"
                style={{ contentVisibility: "auto" }}
              >
                {/* 1. Grid Guidelines & Tracks */}
                
                {/* 2호선 Circle Track Green Loop (Gangnam - Sadang - Sindorim - Cityhall) */}
                <path 
                  d="M 120,240 L 120,110 L 250,110 L 380,110 L 380,240 L 250,240 Z" 
                  fill="none" 
                  stroke="#009255" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  strokeLinejoin="round" 
                />

                {/* 4호선 Blue Slash (Seoul - Sadang - Ichon) */}
                <path 
                  d="M 230,60 L 380,240 L 250,310" 
                  fill="none" 
                  stroke="#00A5DE" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 1호선 Blue Branch (Sindorim - Seoul railway) */}
                <path 
                  d="M 120,240 L 230,60 L 250,110" 
                  fill="none" 
                  stroke="#0052A4" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 3호선 Orange Branch (Gyodae - Terminal) */}
                <path 
                  d="M 380,110 L 410,180" 
                  fill="none" 
                  stroke="#EF7C1C" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                />

                {/* 2. Interactive Nodes Group mapped specifically */}
                {/* 신도림 (2호선/1호선 환승) coords: 120, 240 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "201")!)} // 2호선 신도림
                  onMouseEnter={() => setHoveredStationName("신도림")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="120" cy="240" r="10" fill="#ffffff" stroke="#009255" strokeWidth="4" />
                  <circle cx="120" cy="240" r="5" fill="#0052A4" />
                  <text x="75" y="244" fill="#ffffff" fontSize="9" fontWeight="extrabold" fontFamily="sans-serif">신도림</text>
                </g>

                {/* 홍대입구 coords: 120, 110 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "202")!)}
                  onMouseEnter={() => setHoveredStationName("홍대입구")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="120" cy="110" r="8" fill="#ffffff" stroke="#009255" strokeWidth="4" />
                  <text x="75" y="114" fill="#ffffff" fontSize="9" fontWeight="extrabold">홍대입구</text>
                </g>

                {/* 시청 (1호선/2호선 환승) coords: 250, 110 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "203")!)}
                  onMouseEnter={() => setHoveredStationName("시청")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="250" cy="110" r="10" fill="#ffffff" stroke="#009255" strokeWidth="3" />
                  <circle cx="250" cy="110" r="4" fill="#0052A4" />
                  <text x="240" y="98" fill="#ffffff" fontSize="9" fontWeight="extrabold">시청</text>
                </g>

                {/* 서울역 (1호선/4호선) coords: 230, 60 / 250, 60 mapped nearby */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "102")!)} // 1호선 서울역
                  onMouseEnter={() => setHoveredStationName("서울역")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="230" cy="65" r="10" fill="#ffffff" stroke="#0052A4" strokeWidth="3" />
                  <circle cx="230" cy="65" r="4" fill="#00A5DE" />
                  <text x="190" y="68" fill="#ffffff" fontSize="9" fontWeight="extrabold">서울역</text>
                </g>

                {/* 교대 (2호선/3호선) coords: 380, 110 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "204")!)} // 2호선 교대
                  onMouseEnter={() => setHoveredStationName("교대")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="380" cy="110" r="10" fill="#ffffff" stroke="#009255" strokeWidth="3" />
                  <circle cx="380" cy="110" r="4" fill="#EF7C1C" />
                  <text x="395" y="114" fill="#ffffff" fontSize="9" fontWeight="extrabold">교대</text>
                </g>

                {/* 강남 (2호선) coords: 380, 180 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "205")!)}
                  onMouseEnter={() => setHoveredStationName("강남")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="380" cy="170" r="8" fill="#ffffff" stroke="#009255" strokeWidth="4" />
                  <text x="395" y="174" fill="#ffffff" fontSize="9" fontWeight="extrabold">강남</text>
                </g>

                {/* 사당 (2호선/4호선) coords: 380, 240 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "206")!)} // 2호선 사당
                  onMouseEnter={() => setHoveredStationName("사당")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="380" cy="240" r="11" fill="#ffffff" stroke="#009255" strokeWidth="4" />
                  <circle cx="380" cy="240" r="5" fill="#00A5DE" />
                  <text x="395" y="244" fill="#ffffff" fontSize="9" fontWeight="extrabold">사당</text>
                </g>

                {/* 이촌 (4호선) coords: 250, 310 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "403")!)}
                  onMouseEnter={() => setHoveredStationName("이촌")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="250" cy="310" r="8" fill="#ffffff" stroke="#00A5DE" strokeWidth="4" />
                  <text x="215" y="325" fill="#ffffff" fontSize="9" fontWeight="extrabold">이촌(박물관)</text>
                </g>

                {/* 고속터미널 coords: 410, 180 */}
                <g 
                  className="cursor-pointer" 
                  onClick={() => handleMapStationSelect(STATIONS.find(s => s.id === "302")!)}
                  onMouseEnter={() => setHoveredStationName("고속터미널")}
                  onMouseLeave={() => setHoveredStationName(null)}
                >
                  <circle cx="410" cy="180" r="8" fill="#ffffff" stroke="#EF7C1C" strokeWidth="4" />
                  <text x="422" y="184" fill="#ffffff" fontSize="8" fontWeight="bold">고속코어</text>
                </g>
              </svg>
            </div>

            {/* Quick guide text */}
            <div className="bg-white/5 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-400 leading-normal border border-white/5">
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">노선도 클릭 길찾기 사용법:</p>
                <p className="mt-0.5 text-slate-400">원하는 역 노드를 한 번 눌러 출발역으로 지정하고, 그 다음 도착하고자 하는 먼 역을 연달아 대입하십시오. 즉시 환승 및 안전하차 출구 계산 시그널 카드를 반환합니다.</p>
              </div>
            </div>
          </div>
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

