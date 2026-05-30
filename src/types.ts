/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Station {
  id: string;
  name: string;
  lineCode: string; // e.g. "2", "4", "1", "3"
  lineName: string; // e.g. "2호선", "4호선"
  lat: number;
  lng: number;
  stationCode: string; // e.g. "226" (사당)
  transferGroupId?: string; // Grouping stations of the same name for transfer (e.g. "SADANG_GRP")
}

export interface Line {
  id: string;
  name: string;
  color: string; // hex color or tailwind spec
  operator: string;
}

export type TransitMode = 
  | "FASTEST"        // 가장 빠른 경로
  | "LEAST_WALK"     // 가장 적게 걷는 경로
  | "FEW_TRANSFERS"  // 환승이 적은 경로
  | "EASY_ACCESS";   // 교통약자(휠체어/유모차) 경로 (엘리베이터 우선)

export interface Platform {
  stationId: string;
  directionName: string; // e.g. "성수외선순환", "신도림내선순환", "당고개방면", "오이도방면"
  trainCarCount: number; // e.g. 10 (10칸 열차), 8 (8칸 열차)
  platformType: "ISLAND" | "SIDE"; // 섬식, 상대식
}

export interface DoorDetail {
  carNumber: number;  // e.g. 1 ~ 10
  doorNumber: number; // e.g. 1 ~ 4
  nearFacilities: string[]; // e.g. ["ELEVATOR", "ESCALATOR", "STAIRS", "TRANSFER_4", "EXIT_1"]
  wheelchairPosition: boolean;
}

export interface StationNode {
  id: string;
  stationId: string;
  type: "PLATFORM_DOOR" | "STAIRS" | "ESCALATOR" | "ELEVATOR" | "TRANSFER_GATE" | "GATE" | "EXIT" | "RESTROOM" | "STORE";
  name: string;
  floor: string; // e.g. "B1", "B2", "B3"
  lat?: number;
  lng?: number;
  x?: number; // visual layout positioning
  y?: number;
  accessibility: {
    wheelchair: boolean;
    escalator: boolean;
    elevator: boolean;
  };
}

export interface StationEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeter: number;
  walkTimeSec: number;
  edgeType: "WALKWAY" | "TRANSFER_WALK" | "STAIRS" | "ESCALATOR" | "ELEVATOR";
  wheelchairAccessible: boolean;
  crowdPenalty: number; // multiplier for rush hour
}

export interface SubwayExit {
  id: string;
  stationId: string;
  exitNumber: string; // e.g. "1", "15", "10-B"
  lat: number;
  lng: number;
  hasElevator: boolean;
  hasEscalator: boolean;
  nearbyPlaces: string[];
}

export interface RealtimeArrival {
  lineCode: string;
  lineName: string;
  stationName: string;
  direction: string; // e.g. "성수 외선순환", "대화행"
  arrivalTimeSec: number; // seconds remaining
  status: "ARRIVING" | "RUNNING" | "STOPPED" | "DEPARTED"; // 진입, 운행중, 전역출발 등
  isExpress: boolean;
  crowdLvl: 1 | 2 | 3 | 4; // 1: 여유, 2: 보통, 3: 주의, 4: 혼잡
  msg: string; // e.g. "3분 후 도착" or "전역 출발"
}

export interface UserReport {
  id: string;
  stationId: string;
  stationName: string;
  type: "STAIRS_CLOSED" | "ESCALATOR_故障" | "ELEVATOR_INSPECT" | "DOOR_RECOMMEND" | "CROWD_INFO" | "OTHER";
  content: string;
  reliabilityScore: number; // Initial 100, downvoted or upvoted by users
  createdAt: string;
  reportedBy: string;
}

export interface SearchItem {
  name: string;
  type: "STATION" | "PLACE";
  stationId?: string;
  lat: number;
  lng: number;
  lineNames?: string[];
}

// 경로 검색 결과 상세 세그먼트
export interface RouteSegment {
  type: "BOARDING" | "RUNNING" | "TRANSFER" | "ALIGHTING";
  stationId: string;
  stationName: string;
  lineCode?: string;
  lineName?: string;
  directionName?: string;
  durationMin: number;
  distanceMeter: number;
  
  // 추천 탑승/하차 위치
  recommendCarNum?: number;
  recommendDoorNum?: number;
  recommendReason?: string; // e.g. "사당역 4호선 환승 계단 바로 앞" 또는 "1번 출구 엘리베이터 바로 앞"
  
  // 환승/출구 이동 세부 정보
  facilityPath?: string[]; // ["계단", "에스컬레이터", "엘리베이터", "평지"]
  accessibilityInfo?: string; // "휠체어 리프트 이용 가능" 등
  crowdLevel?: "LOW" | "NORMAL" | "HIGH" | "VERY_HIGH";
  
  // 중간 정차역 정보 (RUNNING 세그먼트의 경우)
  stopStationsCount?: number;
  stopStationsList?: string[];
}

export interface SubwayRoute {
  id: string;
  mode: TransitMode;
  totalDurationMin: number;
  totalDistanceMeter: number;
  totalWalkDistanceMeter: number;
  transferCount: number;
  fare: number;
  
  startStationId: string;
  startStationName: string;
  endStationId: string;
  endStationName: string;
  
  segments: RouteSegment[];
  
  recomReason: string; // e.g. "가장 빠르고 많이 걷지 않는 최적화 경로"
  warnings: string[]; // e.g. "막차 위험(사당역 환승 대기 12분)", "엘리베이터 점검중(서울역 4번출구)"
}
