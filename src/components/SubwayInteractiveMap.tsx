import React, { useState, useRef, useMemo } from "react";
import { Station, SubwayRoute } from "../types";
import { STATIONS, LINE_SEQUENCES } from "../subwayData";
import { 
  Sparkles, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  Info,
  X,
  ExternalLink,
  RefreshCw,
  Compass,
  AlertTriangle,
  Move,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface SubwayInteractiveMapProps {
  startStation: Station | null;
  endStation: Station | null;
  activeRoute?: SubwayRoute | null;
  onSelectStation: (station: Station, role?: "START" | "END") => void;
  onReset?: () => void;
  onShowStationDetails?: (stationName: string) => void;
}

// Complete precise topological coordinates for 100% of stations
const MAP_COORDINATES: Record<string, { x: number; y: number }> = {
  // Transfer Groups & Hubs (Stations sharing names map here dynamically)
  "SINDORIM_GRP": { x: 180, y: 460 },
  "SEOUL_GRP": { x: 380, y: 320 },
  "CITYHALL_GRP": { x: 380, y: 220 },
  "YONGSAN_GRP": { x: 340, y: 420 },
  "NORYAN_GRP": { x: 280, y: 460 },
  "SUWON_GRP": { x: 180, y: 780 },
  "CHEONGRYANG_GRP": { x: 680, y: 150 },
  "GEUMJEONG_GRP": { x: 280, y: 680 },
  "HONGDAE_GRP": { x: 160, y: 150 },
  "GYODAE_GRP": { x: 580, y: 520 },
  "GANGNAM_GRP": { x: 640, y: 520 },
  "SADANG_GRP": { x: 440, y: 520 },
  "JAMSIL_GRP": { x: 880, y: 480 },
  "HAPJEONG_GRP": { x: 100, y: 200 },
  "WANGSIM_GRP": { x: 620, y: 240 },
  "DONGJAK_GRP": { x: 440, y: 460 },
  "EXPRESS_GRP": { x: 500, y: 460 },
  "YEONSIN_GRP": { x: 220, y: 60 },
  "SINSA_GRP": { x: 500, y: 340 },
  "YANGJAE_GRP": { x: 640, y: 580 },
  "JONGRO_GRP": { x: 440, y: 140 },
  "DONGDAEMUN_GRP": { x: 540, y: 140 },
  "SAMGAKJI_GRP": { x: 380, y: 420 },
  "YEOUIDO_GRP": { x: 220, y: 380 },
  "GONGDEOK_GRP": { x: 280, y: 300 },
  "CHEONHO_GRP": { x: 920, y: 310 },
  "DMC_GRP": { x: 100, y: 100 },
  "SINDANG_GRP": { x: 560, y: 200 },
  "YAKSU_GRP": { x: 480, y: 260 },
  "DAELIM_GRP": { x: 150, y: 520 },
  "KONKUK_GRP": { x: 740, y: 310 },
  "NONHYEON_GRP": { x: 540, y: 340 },
  "GIMPO_GRP": { x: 40, y: 280 },
  "SINNON_GRP": { x: 590, y: 340 },
  "SUSEO_GRP": { x: 800, y: 580 },
  "DOGOK_GRP": { x: 740, y: 580 },
  "JEONGJA_GRP": { x: 640, y: 720 },
  "MORAN_GRP": { x: 860, y: 720 },
  "BOKJEONG_GRP": { x: 860, y: 580 },
  "SEONLEUNG_GRP": { x: 740, y: 520 },
  "ONSU_GRP": { x: 155, y: 460 },
  "ICHON_GRP": { x: 350, y: 430 },

  // Line 1 Dedicated
  "101": { x: 180, y: 460 }, // 신도림
  "102": { x: 380, y: 320 }, // 서울역
  "103": { x: 380, y: 220 }, // 시청
  "108": { x: 340, y: 420 }, // 용산
  "109": { x: 180, y: 380 }, // 영등포
  "110": { x: 280, y: 460 }, // 노량진
  "111": { x: 180, y: 780 }, // 수원
  "112": { x: 30, y: 460 },  // 인천
  "113": { x: 55, y: 460 },  // 부평
  "126": { x: 80, y: 460 },  // 송내
  "125": { x: 105, y: 460 }, // 부천
  "127": { x: 130, y: 460 }, // 역곡
  "128": { x: 155, y: 460 }, // 온수
  "129": { x: 170, y: 460 }, // 구로
  "114": { x: 680, y: 150 }, // 청량리
  "115": { x: 200, y: 340 }, // 신길
  "116": { x: 230, y: 340 }, // 대방
  "117": { x: 380, y: 280 }, // 남영
  "118": { x: 180, y: 820 }, // 평택
  "119": { x: 180, y: 855 }, // 천안
  "120": { x: 280, y: 710 }, // 당정
  "121": { x: 280, y: 730 }, // 의왕
  "122": { x: 280, y: 750 }, // 성균관대
  "123": { x: 280, y: 775 }, // 화서
  "124": { x: 280, y: 680 }, // 금정

  // 수인분당선 (SB) Dedicated & Extension
  "SB01": { x: 180, y: 780 }, // 수원
  "SB02": { x: 220, y: 780 }, // 매교
  "SB03": { x: 260, y: 780 }, // 수원시청
  "SB04": { x: 300, y: 780 }, // 매탄권선
  "SB05": { x: 340, y: 780 }, // 망포
  "SB10": { x: 400, y: 780 }, // 기흥
  "SB11": { x: 460, y: 780 }, // 죽전
  "SB13": { x: 580, y: 780 }, // 미금
  "SB14": { x: 640, y: 720 }, // 정자
  "SB15": { x: 740, y: 720 }, // 서현
  "SB16": { x: 800, y: 720 }, // 야탑
  "SB17": { x: 860, y: 720 }, // 모란
  "SB07": { x: 860, y: 580 }, // 복정
  "SB06": { x: 800, y: 580 }, // 수서
  "SB12": { x: 740, y: 580 }, // 도곡
  "SB08": { x: 740, y: 520 }, // 선릉

  // Line 2 Dedicated
  "201": { x: 180, y: 460 }, // 신도림
  "202": { x: 160, y: 150 }, // 홍대입구
  "203": { x: 380, y: 220 }, // 시청
  "204": { x: 580, y: 520 }, // 교대
  "205": { x: 640, y: 520 }, // 강남
  "206": { x: 440, y: 520 }, // 사당
  "207": { x: 880, y: 480 }, // 잠실
  "208": { x: 230, y: 150 }, // 신촌
  "209": { x: 290, y: 150 }, // 이대
  "210": { x: 100, y: 200 }, // 합정
  "211": { x: 740, y: 240 }, // 성수
  "212": { x: 740, y: 310 }, // 건대입구
  "213": { x: 820, y: 520 }, // 삼성
  "214": { x: 520, y: 520 }, // 서초
  "215": { x: 480, y: 520 }, // 방배
  "216": { x: 150, y: 520 }, // 대림
  "217": { x: 690, y: 520 }, // 역삼
  "218": { x: 740, y: 520 }, // 선릉

  // Line 3 Dedicated
  "301": { x: 580, y: 520 }, // 교대
  "302": { x: 500, y: 460 }, // 고속터미널
  "303": { x: 280, y: 60 },  // 삼송
  "304": { x: 220, y: 60 },  // 연신내
  "305": { x: 340, y: 100 }, // 경복궁
  "306": { x: 390, y: 100 }, // 안국
  "307": { x: 500, y: 290 }, // 압구정
  "308": { x: 500, y: 340 }, // 신사
  "309": { x: 640, y: 580 }, // 양재
  "310": { x: 440, y: 140 }, // 종로3가
  "311": { x: 160, y: 60 },  // 지축
  "312": { x: 800, y: 580 }, // 수서
  "313": { x: 680, y: 580 }, // 매봉
  "314": { x: 740, y: 580 }, // 도곡
  "315": { x: 740, y: 620 }, // 대치
  "316": { x: 740, y: 650 }, // 학여울
  "317": { x: 740, y: 680 }, // 대청
  "318": { x: 770, y: 680 }, // 일원

  // Line 4 Dedicated
  "401": { x: 380, y: 320 }, // 서울역
  "402": { x: 440, y: 520 }, // 사당
  "403": { x: 350, y: 430 }, // 이촌
  "404": { x: 410, y: 250 }, // 명동
  "405": { x: 470, y: 100 }, // 혜화
  "406": { x: 540, y: 140 }, // 동대문
  "407": { x: 380, y: 420 }, // 삼각지
  "408": { x: 440, y: 460 }, // 동작
  "409": { x: 40, y: 680 },  // 오이도
  "410": { x: 440, y: 210 }, // 충무로
  "411": { x: 350, y: 680 }, // 정부과천청사
  "412": { x: 350, y: 640 }, // 인덕원
  "413": { x: 350, y: 600 }, // 범계
  "414": { x: 280, y: 680 }, // 금정
  "415": { x: 220, y: 680 }, // 산본
  "416": { x: 310, y: 680 }, // 평촌
  "417": { x: 400, y: 640 }, // 과천
  "418": { x: 400, y: 600 }, // 대공원
  "419": { x: 400, y: 560 }, // 선바위

  // Line 5 Dedicated
  "501": { x: 220, y: 380 }, // 여의도
  "502": { x: 60, y: 340 },  // 까치산
  "503": { x: 350, y: 150 }, // 광화문
  "504": { x: 280, y: 300 }, // 공덕
  "505": { x: 620, y: 240 }, // 왕십리
  "506": { x: 920, y: 310 }, // 천호
  "507": { x: 440, y: 140 }, // 종로3가

  // Line 6 Dedicated
  "601": { x: 100, y: 200 }, // 합정
  "602": { x: 100, y: 100 }, // 디지털미디어시티
  "603": { x: 280, y: 300 }, // 공덕
  "604": { x: 380, y: 420 }, // 삼각지
  "605": { x: 560, y: 200 }, // 신당
  "606": { x: 480, y: 260 }, // 약수

  // Line 7 Dedicated
  "701": { x: 150, y: 580 }, // 가산디지털단지
  "702": { x: 150, y: 520 }, // 대림
  "703": { x: 500, y: 460 }, // 고속터미널
  "704": { x: 540, y: 340 }, // 논현
  "705": { x: 740, y: 310 }, // 건대입구
  "706": { x: 680, y: 60 },  // 노원
  "707": { x: 155, y: 460 }, // 온수

  // Line 8 Dedicated
  "801": { x: 880, y: 480 }, // 잠실
  "802": { x: 880, y: 530 }, // 석촌
  "803": { x: 920, y: 310 }, // 천호
  "804": { x: 860, y: 580 }, // 복정
  "805": { x: 860, y: 720 }, // 모란

  // Line 9 Dedicated
  "901": { x: 40, y: 280 },  // 김포공항
  "912": { x: 100, y: 280 }, // 당산
  "902": { x: 220, y: 380 }, // 여의도
  "903": { x: 250, y: 410 }, // 샛강
  "904": { x: 280, y: 460 }, // 노량진
  "905": { x: 440, y: 460 }, // 동작
  "906": { x: 500, y: 460 }, // 고속터미널
  "907": { x: 590, y: 340 }, // 신논현
  "908": { x: 700, y: 460 }, // 선정릉
  "909": { x: 800, y: 480 }, // 종합운동장
  "910": { x: 925, y: 410 }, // 올림픽공원
  "911": { x: 950, y: 450 }, // 중앙보훈병원

  // 신분당선 (DX) Dedicated
  "D01": { x: 500, y: 340 }, // 신사
  "D02": { x: 540, y: 340 }, // 논현
  "D03": { x: 590, y: 340 }, // 신논현
  "D04": { x: 640, y: 520 }, // 강남
  "D05": { x: 640, y: 580 }, // 양재
  "D06": { x: 640, y: 660 }, // 판교
  "D07": { x: 640, y: 720 }, // 정자

  // 경의중앙선 (K) Dedicated
  "K01": { x: 40, y: 60 },   // 문산
  "K02": { x: 100, y: 100 }, // 디지털미디어시티
  "K03": { x: 160, y: 150 }, // 홍대입구
  "K04": { x: 340, y: 420 }, // 용산
  "K05": { x: 350, y: 430 }, // 이촌
  "K06": { x: 620, y: 240 }, // 왕십리
  "K07": { x: 680, y: 150 }, // 청량리
  "K08": { x: 740, y: 150 }, // 지평
};

// Line Style configurations representing high-contrast palette
const LINE_STYLES: Record<string, { color: string; label: string }> = {
  "1": { color: "#0D3692", label: "1호선" },
  "2": { color: "#33A23D", label: "2호선" },
  "3": { color: "#FE5D10", label: "3호선" },
  "4": { color: "#00A1E9", label: "4호선" },
  "5": { color: "#A05EB5", label: "5호선" },
  "6": { color: "#CD7C2F", label: "6호선" },
  "7": { color: "#54640D", label: "7호선" },
  "8": { color: "#E51E6E", label: "8호선" },
  "9": { color: "#AA9044", label: "9호선" },
  "DX": { color: "#D4003B", label: "신분당선" },
  "K": { color: "#76C6A5", label: "경의중앙" },
  "SB": { color: "#F7AA13", label: "수인분당" },
};

export default function SubwayInteractiveMap({
  startStation,
  endStation,
  activeRoute,
  onSelectStation,
  onReset,
  onShowStationDetails
}: SubwayInteractiveMapProps) {
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedHub, setSelectedHub] = useState<{ x: number; y: number; stations: Station[] } | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // 1. Helper to fetch coordinates cleanly with a bulletproof dynamic fallback
  const getCoords = (station: Station): { x: number; y: number} => {
    if (station.transferGroupId && MAP_COORDINATES[station.transferGroupId]) {
      return MAP_COORDINATES[station.transferGroupId];
    }
    if (MAP_COORDINATES[station.id]) {
      return MAP_COORDINATES[station.id];
    }
    const hash = station.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      x: 350 + (hash % 300),
      y: 350 + ((hash * 7) % 300)
    };
  };

  // 2. Extract active route stations for beautiful localized path highlighting
  const activeRouteStationNames = useMemo(() => {
    if (!activeRoute) return new Set<string>();
    const names = new Set<string>();
    names.add(activeRoute.startStationName);
    names.add(activeRoute.endStationName);
    activeRoute.segments.forEach(seg => {
      if (seg.stationName) {
        names.add(seg.stationName);
      }
      if (seg.stopStationsList) {
        seg.stopStationsList.forEach(name => names.add(name));
      }
    });
    return names;
  }, [activeRoute]);

  // Determine if a node should render bright or dim
  const isNodeAlongRoute = (name: string) => {
    if (!activeRoute) return true;
    return activeRouteStationNames.has(name);
  };

  // Determine if a connection line coordinate block is along the active route
  const isSegmentAlongRoute = (idA: string, idB: string) => {
    if (!activeRoute) return true;
    const stA = STATIONS.find(s => s.id === idA);
    const stB = STATIONS.find(s => s.id === idB);
    if (!stA || !stB) return false;
    return activeRouteStationNames.has(stA.name) && activeRouteStationNames.has(stB.name);
  };

  // 3. Connect sequential coordinates along the active path to draw a neon glowing dash track
  const routePathPoints = useMemo(() => {
    if (!activeRoute) return [];
    const points: { x: number; y: number; name: string }[] = [];
    const visitedNames = new Set<string>();
    
    activeRoute.segments.forEach(seg => {
      const st = STATIONS.find(s => s.name === seg.stationName);
      if (st) {
        const coords = getCoords(st);
        if (!visitedNames.has(seg.stationName)) {
          points.push({ ...coords, name: seg.stationName });
          visitedNames.add(seg.stationName);
        }
      }
      
      if (seg.stopStationsList) {
        seg.stopStationsList.forEach(name => {
          const sStop = STATIONS.find(s => s.name === name);
          if (sStop && !visitedNames.has(name)) {
            const coords = getCoords(sStop);
            points.push({ ...coords, name });
            visitedNames.add(name);
          }
        });
      }
    });

    const lastSt = STATIONS.find(s => s.name === activeRoute.endStationName);
    if (lastSt && !visitedNames.has(activeRoute.endStationName)) {
      points.push({ ...getCoords(lastSt), name: activeRoute.endStationName });
    }
    
    return points;
  }, [activeRoute]);

  // Helper to determine the subway line color for a track connecting two consecutive stations
  const getConnectingLineColor = (nameA: string, nameB: string): string => {
    const idsA = STATIONS.filter(s => s.name === nameA).map(s => s.id);
    const idsB = STATIONS.filter(s => s.name === nameB).map(s => s.id);
    
    for (const [lineCode, sequences] of Object.entries(LINE_SEQUENCES)) {
      for (const seq of sequences) {
        for (let i = 0; i < seq.length - 1; i++) {
          if (
            (idsA.includes(seq[i]) && idsB.includes(seq[i + 1])) ||
            (idsB.includes(seq[i]) && idsA.includes(seq[i + 1]))
          ) {
            return LINE_STYLES[lineCode]?.color || "#10B981";
          }
        }
      }
      if (lineCode === "2") {
        for (const seq of sequences) {
          if (seq.length > 1) {
            const idLast = seq[seq.length - 1];
            const idFirst = seq[0];
            if (
              (idsA.includes(idLast) && idsB.includes(idFirst)) ||
              (idsB.includes(idLast) && idsA.includes(idFirst))
            ) {
              return LINE_STYLES["2"]?.color || "#10B981";
            }
          }
        }
      }
    }
    
    if (activeRoute) {
      const seg = activeRoute.segments.find(
        (s) =>
          s.stationName === nameA ||
          s.stationName === nameB ||
          s.stopStationsList?.includes(nameA) ||
          s.stopStationsList?.includes(nameB)
      );
      if (seg && seg.lineCode && LINE_STYLES[seg.lineCode]) {
        return LINE_STYLES[seg.lineCode].color;
      }
    }
    
    return "#10B981";
  };

  // Group stations by coordinates to render single unified Transfer Hub Circles
  const uniqueHubMap: Record<string, { x: number; y: number; stations: Station[]; isTransfer: boolean }> = {};
  
  STATIONS.forEach(s => {
    const coords = getCoords(s);
    const key = `${coords.x},${coords.y}`;
    if (!uniqueHubMap[key]) {
      uniqueHubMap[key] = {
        x: coords.x,
        y: coords.y,
        stations: [],
        isTransfer: false
      };
    }
    uniqueHubMap[key].stations.push(s);
  });

  Object.values(uniqueHubMap).forEach(hub => {
    const lineCodes = new Set(hub.stations.map(st => st.lineCode));
    const isTransGrp = hub.stations.some(st => !!st.transferGroupId);
    hub.isTransfer = lineCodes.size > 1 || isTransGrp;
  });

  // Zoom Handler
  const handleZoom = (factor: number) => {
    setZoomLevel(prev => Math.min(Math.max(prev * factor, 0.5), 2.5));
  };

  // Recenter to center/default alignment
  const handleRecenter = () => {
    setZoomLevel(1.0);
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollTo({
        left: 200,
        top: 250,
        behavior: "smooth"
      });
    }
    setSelectedHub(null);
  };

  // Mouse Drag Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".popover-content")) return;
    if (!mapContainerRef.current) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: mapContainerRef.current.scrollLeft,
      scrollTop: mapContainerRef.current.scrollTop,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mapContainerRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    mapContainerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    mapContainerRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Mobile Touch Pan Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest(".popover-content")) return;
    if (!mapContainerRef.current) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollLeft: mapContainerRef.current.scrollLeft,
      scrollTop: mapContainerRef.current.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !mapContainerRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    mapContainerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    mapContainerRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleStationClick = (stations: Station[], hubX: number, hubY: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHub({ x: hubX, y: hubY, stations });
  };

  const isSelectedAsStart = (hubStations: Station[]) => {
    return startStation && hubStations.some(s => s.name === startStation.name);
  };

  const isSelectedAsEnd = (hubStations: Station[]) => {
    return endStation && hubStations.some(s => s.name === endStation.name);
  };

  return (
    <div className="bg-[#111114] border border-white/10 rounded-2xl shadow-2xl p-4 md:p-5 space-y-4 text-left select-none">
      {/* Interactive Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            수도권 광역 전철 대화형 노선도 (Interactive Grid)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            역 노드를 클릭해 직접 승차 탐색을 하거나 드래그하여 고해상도 전체 네트워크 배치를 조율하십시오.
          </p>
        </div>
        
        {/* Top Controls Box */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(1.25)}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="확대"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleZoom(0.8)}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="축소"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleRecenter}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="중앙정렬 및 회복"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">화면정렬</span>
          </button>

          {onReset && (startStation || endStation) && (
            <button
              onClick={onReset}
              className="p-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>선택 초기화</span>
            </button>
          )}
        </div>
      </div>

      {/* Select State Tracker indicators */}
      <div className="grid grid-cols-2 gap-3 bg-[#18181C] p-3 rounded-xl border border-white/5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-slate-400 font-semibold">출발역:</span>
          {startStation ? (
            <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1">
              {startStation.name}역
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.2 rounded">Start</span>
            </span>
          ) : (
            <span className="text-slate-500 font-medium">노선도에서 역을 클릭해 지정</span>
          )}
        </div>
        <div className="flex items-center gap-2 border-l border-white/5 pl-3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <span className="text-slate-400 font-semibold">도착역:</span>
          {endStation ? (
            <span className="text-rose-400 font-extrabold text-sm flex items-center gap-1">
              {endStation.name}역
              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/15 px-1.5 py-0.2 rounded">End</span>
            </span>
          ) : (
            <span className="text-slate-500 font-medium">목지 대기중...</span>
          )}
        </div>
      </div>

      {/* Map Drag Instructions Help Tag */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-1">
        <Move className="w-3.5 h-3.5 text-sky-400" />
        <span>지도가 모니터를 벗어날 시 마우스 또는 패드로 드래그하여 상하좌우 자유롭게 스크롤 이동이 가능합니다.</span>
      </div>

      {/* SVG Container wrapped for panning */}
      <div 
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
        onClick={() => setSelectedHub(null)}
        className={`w-full relative bg-[#070709] border border-white/5 rounded-2xl overflow-auto select-none custom-scrollbar shadow-inner transition-colors duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ minHeight: "420px", maxHeight: "640px" }}
      >
        <div 
          className="transition-transform duration-300 ease-out origin-top-left relative"
          style={{ transform: `scale(${zoomLevel})`, width: "1050px", height: "880px" }}
        >
          <svg 
            width="1050" 
            height="880"
            className="select-none"
          >
            {/* SVG Inlined Style keyframes for stunning route flow animation */}
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: -200;
                }
              }
            `}</style>

            <defs>
              <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Blueprint Grid Lines */}
            <g opacity="0.04">
              {Array.from({ length: 23 }).map((_, i) => (
                <line key={`lh-${i}`} x1="0" y1={i * 40} x2="1050" y2={i * 40} stroke="#ffffff" strokeWidth="1" />
              ))}
              {Array.from({ length: 27 }).map((_, i) => (
                <line key={`lv-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="880" stroke="#ffffff" strokeWidth="1" />
              ))}
            </g>

            {/* Render Track Connections dynamically between successive stations */}
            {Object.entries(LINE_SEQUENCES).map(([lineCode, segments]) => {
              const lineStyle = LINE_STYLES[lineCode] || { color: "#FFFFFF", label: "경로" };

              return segments.map((stationSeq, sIdx) => {
                const lineElements: React.ReactNode[] = [];

                for (let i = 0; i < stationSeq.length - 1; i++) {
                  const idA = stationSeq[i];
                  const idB = stationSeq[i + 1];
                  const stA = STATIONS.find(s => s.id === idA);
                  const stB = STATIONS.find(s => s.id === idB);

                  if (stA && stB) {
                    const ptA = getCoords(stA);
                    const ptB = getCoords(stB);
                    const isAlong = isSegmentAlongRoute(idA, idB);
                    const opacity = activeRoute ? (isAlong ? 0.95 : 0.12) : 0.85;
                    const strokeWidth = activeRoute ? (isAlong ? 6 : 3) : 3.5;

                    lineElements.push(
                      <g key={`track-seg-${lineCode}-${idA}-${idB}-${i}`}>
                        {/* Outline of track */}
                        <line
                          x1={ptA.x}
                          y1={ptA.y}
                          x2={ptB.x}
                          y2={ptB.y}
                          stroke="#070709"
                          strokeWidth={strokeWidth + 3.5}
                          strokeLinecap="round"
                          opacity={opacity}
                        />
                        {/* Colorful core of track */}
                        <line
                          x1={ptA.x}
                          y1={ptA.y}
                          x2={ptB.x}
                          y2={ptB.y}
                          stroke={lineStyle.color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          opacity={opacity}
                        />
                      </g>
                    );
                  }
                }

                // Close circular loop connection for Line 2
                if (lineCode === "2" && stationSeq.length > 1) {
                  const idA = stationSeq[stationSeq.length - 1];
                  const idB = stationSeq[0];
                  const stA = STATIONS.find(s => s.id === idA);
                  const stB = STATIONS.find(s => s.id === idB);
                  if (stA && stB) {
                    const ptA = getCoords(stA);
                    const ptB = getCoords(stB);
                    const isAlong = isSegmentAlongRoute(idA, idB);
                    const opacity = activeRoute ? (isAlong ? 0.95 : 0.12) : 0.85;
                    const strokeWidth = activeRoute ? (isAlong ? 6 : 3) : 3.5;
                    lineElements.push(
                      <g key={`track-seg-circular-2`}>
                        <line
                          x1={ptA.x}
                          y1={ptA.y}
                          x2={ptB.x}
                          y2={ptB.y}
                          stroke="#070709"
                          strokeWidth={strokeWidth + 3.5}
                          strokeLinecap="round"
                          opacity={opacity}
                        />
                        <line
                          x1={ptA.x}
                          y1={ptA.y}
                          x2={ptB.x}
                          y2={ptB.y}
                          stroke={lineStyle.color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          opacity={opacity}
                        />
                      </g>
                    );
                  }
                }

                return (
                  <g key={`track-line-${lineCode}-${sIdx}`}>
                    {lineElements}
                  </g>
                );
              });
            })}

            {/* Overlay Neon animated path on top of the map corresponding to the activeRoute */}
            {routePathPoints.length >= 2 && (
              <g>
                {/* 1. Underlying giant glowing blur halo trace */}
                {routePathPoints.map((p, idx) => {
                  if (idx === routePathPoints.length - 1) return null;
                  const nextP = routePathPoints[idx + 1];
                  const segmentColor = getConnectingLineColor(p.name, nextP.name);
                  return (
                    <line
                      key={`halo-seg-${idx}`}
                      x1={p.x}
                      y1={p.y}
                      x2={nextP.x}
                      y2={nextP.y}
                      stroke={segmentColor}
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.3"
                      className="animate-pulse"
                    />
                  );
                })}
                {/* 2. Top dash animated active routing flow trace */}
                {routePathPoints.map((p, idx) => {
                  if (idx === routePathPoints.length - 1) return null;
                  const nextP = routePathPoints[idx + 1];
                  const segmentColor = getConnectingLineColor(p.name, nextP.name);
                  return (
                    <line
                      key={`flow-seg-${idx}`}
                      x1={p.x}
                      y1={p.y}
                      x2={nextP.x}
                      y2={nextP.y}
                      stroke={segmentColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: "12 6",
                        animation: "dash 30s linear infinite"
                      }}
                    />
                  );
                })}
              </g>
            )}

            {/* Station Hub Nodes */}
            {Object.values(uniqueHubMap).map((hub, idx) => {
              const representsStart = isSelectedAsStart(hub.stations);
              const representsEnd = isSelectedAsEnd(hub.stations);
              const isHovered = hoveredStation && hub.stations.some(s => s.id === hoveredStation.id);
              const isAlong = isNodeAlongRoute(hub.stations[0].name);
              
              // Find style belonging to first station’s line
              const lineStyles = hub.stations.map(st => LINE_STYLES[st.lineCode] || { color: "#FFF", label: "" });
              const primaryColor = lineStyles[0]?.color || "#FFF";

              // Opacity dims non-routing items
              const opacity = activeRoute ? (isAlong ? 1.0 : 0.22) : 1.0;
              const radius = hub.isTransfer ? 9.5 : 6;
              const strokeWidth = hub.isTransfer ? 3 : 1.5;

              return (
                <g
                  key={`hub-node-${idx}`}
                  className="cursor-pointer"
                  onClick={(e) => handleStationClick(hub.stations, hub.x, hub.y, e)}
                  onMouseEnter={() => setHoveredStation(hub.stations[0])}
                  onMouseLeave={() => setHoveredStation(null)}
                  opacity={opacity}
                >
                  {/* Expanded click target area */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="22"
                    fill="transparent"
                  />

                  {/* Pulsing indicator for active start station */}
                  {representsStart && (
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="16"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      opacity="0.8"
                      className="animate-ping"
                      style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
                    />
                  )}
                  {/* Pulsing indicator for active end station */}
                  {representsEnd && (
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="16"
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="2.5"
                      opacity="0.8"
                      className="animate-ping"
                      style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
                    />
                  )}

                  {/* Node Background Pill */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={radius + 2.5}
                    fill="#FFFFFF"
                    stroke={representsStart ? "#10B981" : representsEnd ? "#F43F5E" : (isHovered ? "#FFF" : "#2E2E33")}
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />

                  {/* Specific Transfer and Normal Station icons */}
                  {hub.isTransfer ? (
                    <>
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r={radius}
                        fill="#FFFFFF"
                        stroke={primaryColor}
                        strokeWidth={strokeWidth}
                        className="transition-all duration-200"
                      />
                      {/* Inner dot representing another line code */}
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r="3.5"
                        fill={lineStyles[1]?.color || primaryColor}
                      />
                    </>
                  ) : (
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r={radius - 1.5}
                      fill={primaryColor}
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Station Label Background Halo Outline for supreme legibility */}
                  <text
                    x={hub.x}
                    y={hub.y - (hub.isTransfer ? 15 : 12)}
                    textAnchor="middle"
                    stroke="#070709"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    fill="none"
                    fontSize={hub.isTransfer ? "10.5" : "8.5"}
                    fontWeight={representsStart || representsEnd || hub.isTransfer || isHovered ? "800" : "600"}
                    className="pointer-events-none tracking-tight select-none opacity-90"
                  >
                    {hub.stations[0].name}
                  </text>

                  {/* Crisp Primary Text Label */}
                  <text
                    x={hub.x}
                    y={hub.y - (hub.isTransfer ? 15 : 12)}
                    textAnchor="middle"
                    fill={representsStart ? "#10B981" : representsEnd ? "#F43F5E" : (isHovered ? "#FFFFFF" : "#E4E4E7")}
                    fontSize={hub.isTransfer ? "10.5" : "8.5"}
                    fontWeight={representsStart || representsEnd || hub.isTransfer || isHovered ? "800" : "600"}
                    className="transition-colors pointer-events-none tracking-tight select-none"
                  >
                    {hub.stations[0].name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* HTML Quick Click Action Menu overlay centered inside raw coordinates wrapper to zoom seamlessly with scale */}
          {selectedHub && (
            <div 
              className="absolute popover-content bg-[#131317]/95 border border-white/10 rounded-xl shadow-2xl p-3 z-50 backdrop-blur-md animate-fadeIn w-[240px]"
              style={{
                left: `${selectedHub.x}px`,
                top: `${selectedHub.y + 15}px`,
                transform: 'translateX(-50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <div>
                  <span className="font-extrabold text-white text-sm">{selectedHub.stations[0].name}역</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">역 연동망 대화형 퀵링크</span>
                </div>
                <button 
                  onClick={() => setSelectedHub(null)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popover Lines Indicator tags */}
              <div className="flex items-center gap-1 flex-wrap mb-3">
                <span className="text-[9px] text-slate-500 font-bold mr-1">노선 정보:</span>
                {selectedHub.stations.map((st, i) => {
                  const style = LINE_STYLES[st.lineCode] || { color: '#888' };
                  return (
                    <span 
                      key={i} 
                      className="text-[8px] px-1.5 py-0.5 rounded font-extrabold text-slate-900 shadow-sm"
                      style={{ backgroundColor: style.color }}
                    >
                      {st.lineCode}
                    </span>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-1.5 font-semibold text-xs text-left">
                <button
                  onClick={() => {
                    onSelectStation(selectedHub.stations[0], "START");
                    setSelectedHub(null);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg text-left flex items-center justify-between text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>출발지 지정</span>
                  </div>
                  <Check className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => {
                    onSelectStation(selectedHub.stations[0], "END");
                    setSelectedHub(null);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg text-left flex items-center justify-between text-rose-400 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                    <span>도착지 지정</span>
                  </div>
                  <Check className="w-3.5 h-3.5 opacity-50" />
                </button>

                {onShowStationDetails && (
                  <button
                    onClick={() => {
                      onShowStationDetails(selectedHub.stations[0].name);
                      setSelectedHub(null);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg text-left flex items-center justify-between text-sky-450 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
                      <span>역사 정보 & 도면 · 혼잡도</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Hovering Tooltip card */}
        {hoveredStation && !selectedHub && (
          <div className="absolute top-3 left-3 bg-[#111114]/95 border border-white/10 p-2.5 rounded-xl shadow-2xl text-xs flex flex-col gap-1 z-15 backdrop-blur-md animate-fadeIn max-w-[280px]">
            <div className="flex items-center gap-2 justify-between">
              <span className="font-extrabold text-white text-sm">{hoveredStation.name}역</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-slate-800 text-slate-300">
                {hoveredStation.lineName}
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-0.5">
              역사 선택 시{' '}
              {!startStation 
                ? <strong className="text-emerald-400">출발 또는 도착 정보</strong> 
                : <strong className="text-rose-400">도착 정보</strong>
              } 지정을 위한 퀵메뉴가 뜹니다.
            </p>

            {/* Check overlay listings */}
            {STATIONS.filter(s => s.name === hoveredStation.name).length > 1 && (
              <div className="mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold shrink-0">경유 노선:</span>
                <div className="flex flex-wrap gap-1">
                  {STATIONS.filter(s => s.name === hoveredStation.name).map((s, i) => {
                    const style = LINE_STYLES[s.lineCode] || { color: '#888' };
                    return (
                      <span 
                        key={i} 
                        className="text-[8px] px-1.5 py-0.2 rounded font-extrabold text-slate-900"
                        style={{ backgroundColor: style.color }}
                      >
                        {s.lineCode}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide manual and legend index box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#18181C] p-4 rounded-xl border border-white/5">
        <div>
          <div className="flex items-start gap-2.5 text-xs text-slate-400 leading-normal">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200 text-[13px]">퀵스타트 사용법 (How To Ride):</p>
              <ul className="mt-1.5 list-disc pl-4 space-y-1 text-[11px] text-slate-400 text-left">
                <li>노선도의 역을 터치하면 <strong>출발/도착</strong> 버튼 팝업이 활성화됩니다.</li>
                <li>원하는 지점 지정 시 실시간 최적화 다익스트라 경로 정밀 분석이 실행됩니다.</li>
                <li>활성화된 탐색 경로는 노선도 내 <strong className="text-emerald-400">그린 네온 스트림</strong>으로 직관적으로 흐르게 설계되어 동선을 즉각 모니터링할 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4 text-left">
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 text-center md:text-left">수도권 전철 노선 지표 (Subway Color Codes)</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[10px]">
            {Object.entries(LINE_STYLES).map(([code, line]) => (
              <div key={code} className="flex items-center gap-1.5 select-none">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-slate-300 font-medium text-[10px] truncate" title={line.label}>{line.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
