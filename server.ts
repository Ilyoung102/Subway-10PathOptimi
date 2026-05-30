/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

import { 
  STATIONS, 
  LINES, 
  EXITS, 
  DOOR_DETAILS, 
  SEARCH_PLACES, 
  findRoutes, 
  getRealtimeArrivals,
  normalizeSearchQuery 
} from "./src/subwayData";
import { TransitMode, UserReport } from "./src/types";

// In-Memory Database for User Reports to satisfy persistent storage behavior
const REPORTS_FILE_PATH = path.join(process.cwd(), "user_reports.json");
let userReports: UserReport[] = [];

// Initialize reports from local json or fallback data
if (fs.existsSync(REPORTS_FILE_PATH)) {
  try {
    userReports = JSON.parse(fs.readFileSync(REPORTS_FILE_PATH, "utf-8"));
  } catch (e) {
    console.error("Failed to parse user_reports.json, resetting to empty", e);
    userReports = [];
  }
} else {
  // Mock seeding for typical scenarios to offer rich realism
  userReports = [
    {
      id: "R1",
      stationId: "206", // 사당역
      stationName: "사당",
      type: "ELEVATOR_INSPECT",
      content: "사당역 4호선 환승 주용 엘리베이터 정기 점검이 완료되어 현재 원활히 가동 중입니다.",
      reliabilityScore: 105,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
      reportedBy: "교통약자도우미"
    },
    {
      id: "R2",
      stationId: "401", // 서울역
      stationName: "서울",
      type: "STAIRS_CLOSED",
      content: "서울역 4번 출구 내부 에스컬레이터 노후 안전 정밀 진단으로 인해 임시 가림막 설치 중이나, 옆 계단 통행은 정상 가능합니다.",
      reliabilityScore: 92,
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      reportedBy: "시민제보봇"
    },
    {
      id: "R3",
      stationId: "205", // 강남역
      stationName: "강남",
      type: "CROWD_INFO",
      content: "강남역 2호선 성수 내선 방향 4-1번 탑승구에 출근 시간대 승객 대기가 과하게 쏠리니, 2-2번 문이나 8-3번 문으로 가시면 쾌적합니다.",
      reliabilityScore: 120,
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      reportedBy: "출퇴근프로"
    }
  ];
  try {
    fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(userReports, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write initial reports", err);
  }
}

// Lazy Gemini API Client Helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("Using mock Gemini calls: GEMINI_API_KEY is not defined or is placeholder.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API - Health Checker
  app.get("/api/health", (req, res) => {
    res.json({ status: "alive", code: 200, time: new Date().toISOString() });
  });

  // 2. API - 전체 역 & 노선 정보 조회
  app.get("/api/subway/stations", (req, res) => {
    res.json({
      stations: STATIONS,
      lines: LINES,
      exits: EXITS,
      doors: DOOR_DETAILS
    });
  });

  // 3. API - 역명 또는 장소 검색 (오타 교정 및 스마트 보정 탑재)
  app.get("/api/subway/search", (req, res) => {
    const query = (req.query.q || "").toString().trim();
    if (!query) {
      return res.json({ query, results: [] });
    }

    const normalized = normalizeSearchQuery(query);

    // 검색 연계 필터링
    const results = SEARCH_PLACES.filter(item => {
      const nameNorm = item.name.toLowerCase().replace(/\s+/g, "");
      return nameNorm.includes(normalized) || item.name.includes(query) || (item.lineNames && item.lineNames.some(ln => ln.includes(query)));
    });

    res.json({
      query,
      normalized,
      results
    });
  });

  // 4. API - AI 스마트 자연어 경로 처리기 (Gemini 활용)
  // 예: "강남역에서 숭례문가고 싶다. 무거운 짐이 있어서 편하게 가려면 어떻게 타야해?" 등의 텍스트 분석
  app.post("/api/subway/natural-route", async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      const client = getGeminiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      
      // Fallback if no valid API key
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("No API key configured");
      }

      const prompt = `이 사용자의 전철 경로 질의 발화: "${message}" 에서 지하철의 "출발역", "도착지(역 또는 주요 랜드마크 명칭)", 그리고 가용한 "경로 탐색 모드"를 정형 JSON 형태로 추출해주세요.
      출발지와 목적지는 우리가 제공하는 역 데이터셋 명칭에 알맞은 핵심 장소(예: "강남", "사당", "서울", "이촌", "숭례문", "국립중앙박물관" 등)로 변환해야 합니다.
      경로 탐색 모드(TransitMode) 종류는 다음과 같습니다:
      - "FASTEST" (가장 빠른 경로)
      - "LEAST_WALK" (최소 도보)
      - "FEW_TRANSFERS" (최소 환승)
      - "EASY_ACCESS" (교통약자/휠체어/오르내림 불편)
      - "LUGGAGE_MODE" (무거운 캐리어/짐 보유)
      - "RAINY_MODE" (비 오는 날 지하 연결 우선)
      - "CROWD_AVOID" (출퇴근 혼잡 회피)
      - "LAST_TRAIN_SAFE" (막차 시간 확보)

      다음 스키마 규격을 충족하는 JSON 포맷만 반환하세요:
      {
        "origin": string (예: "강남" 또는 "사당" 등),
        "destination": string (예: "서울" 또는 "박물관" 등),
        "mode": "FASTEST" | "LEAST_WALK" | "FEW_TRANSFERS" | "EASY_ACCESS" | "LUGGAGE_MODE" | "RAINY_MODE" | "CROWD_AVOID" | "LAST_TRAIN_SAFE",
        "hasLuggage": boolean,
        "isVulnerable": boolean,
        "isRainy": boolean,
        "explanation": string (사용자의 니즈를 분석한 간략한 1문장 한국어 설명)
      }`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              origin: { type: Type.STRING },
              destination: { type: Type.STRING },
              mode: { type: Type.STRING },
              hasLuggage: { type: Type.BOOLEAN },
              isVulnerable: { type: Type.BOOLEAN },
              isRainy: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING }
            },
            required: ["origin", "destination", "mode", "explanation"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text.trim());
      res.json({ success: true, aiAnalysis: parsedResult });
    } catch (err: any) {
      console.warn("Fallback to regex/rule search (Gemini API skipped or errored):", err?.message);
      
      // Fallback rule parsing
      let origin = "강남";
      let destination = "서울역";
      let mode: TransitMode = "FASTEST";
      
      const msgNorm = message.replace(/\s+/g, "");
      
      if (msgNorm.includes("교통약자") || msgNorm.includes("휠체어") || msgNorm.includes("유모차") || msgNorm.includes("불편")) {
        mode = "EASY_ACCESS";
      } else if (msgNorm.includes("짐") || msgNorm.includes("캐리어") || msgNorm.includes("공항") || msgNorm.includes("가방")) {
        mode = "LUGGAGE_MODE";
      } else if (msgNorm.includes("비") || msgNorm.includes("우산") || msgNorm.includes("레인") || msgNorm.includes("비가")) {
        mode = "RAINY_MODE";
      } else if (msgNorm.includes("자리") || msgNorm.includes("혼잡") || msgNorm.includes("붐비")) {
        mode = "CROWD_AVOID";
      } else if (msgNorm.includes("걷기") || msgNorm.includes("적게") || msgNorm.includes("걸을")) {
        mode = "LEAST_WALK";
      } else if (msgNorm.includes("환승") || msgNorm.includes("귀찮")) {
        mode = "FEW_TRANSFERS";
      } else if (msgNorm.includes("막차") || msgNorm.includes("놓치")) {
        mode = "LAST_TRAIN_SAFE";
      }

      if (msgNorm.includes("홍대")) origin = "홍대입구";
      if (msgNorm.includes("박물관") || msgNorm.includes("이촌") || msgNorm.includes("국립")) destination = "국립중앙박물관";

      res.json({
        success: true,
        aiAnalysis: {
          origin,
          destination,
          mode,
          hasLuggage: mode === "LUGGAGE_MODE",
          isVulnerable: mode === "EASY_ACCESS",
          isRainy: mode === "RAINY_MODE",
          explanation: "자연어 규칙 분석기 fallback을 통해 최적 검색 모드와 위치를 자동 추출했습니다."
        }
      });
    }
  });

  // 5. API - 경로 검색 (추천 알고리즘 수행)
  app.get("/api/subway/route", (req, res) => {
    const fromId = (req.query.from || "").toString();
    const toId = (req.query.to || "").toString();
    const mode = (req.query.mode || "FASTEST") as TransitMode;
    const exitParam = req.query.exit ? req.query.exit.toString() : undefined;

    if (!fromId || !toId) {
      return res.status(400).json({ error: "Origin(from) and Destination(to) are required parameters." });
    }

    try {
      const routes = findRoutes(fromId, toId, mode, exitParam);
      res.json({
        from: fromId,
        to: toId,
        mode,
        routes
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Route calculation error" });
    }
  });

  // 6. API - 실시간 도착 예정 정보 (역 명칭 기준)
  app.get("/api/subway/realtime", (req, res) => {
    const stationName = (req.query.stationName || "").toString().trim();
    if (!stationName) {
      return res.status(400).json({ error: "stationName is required" });
    }
    const arrivals = getRealtimeArrivals(stationName);
    res.json({
      stationName,
      arrivals
    });
  });

  // 7. API - 제보(Report) 리스트 조회
  app.get("/api/subway/reports", (req, res) => {
    const stationId = req.query.stationId ? req.query.stationId.toString() : null;
    if (stationId) {
      const filtered = userReports.filter(r => r.stationId === stationId);
      return res.json(filtered);
    }
    res.json(userReports);
  });

  // 8. API - 신규 제보 제출
  app.post("/api/subway/report", (req, res) => {
    const { stationId, stationName, type, content, reportedBy } = req.body;
    
    if (!stationId || !stationName || !type || !content) {
      return res.status(400).json({ error: "Missing required fields in report payload" });
    }

    const newReport: UserReport = {
      id: "R_" + Date.now(),
      stationId,
      stationName,
      type,
      content,
      reliabilityScore: 100, // starting baseline
      reportedBy: reportedBy || "익명제보자",
      createdAt: new Date().toISOString()
    };

    userReports.unshift(newReport);

    // Save to file persistently
    try {
      fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(userReports, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist user report", err);
    }

    res.status(201).json({ success: true, report: newReport });
  });

  // 9. API - 제보 신뢰도 추천/비추천 투표
  app.post("/api/subway/report/:id/vote", (req, res) => {
    const reportId = req.params.id;
    const { action } = req.body; // "UP" | "DOWN"

    const rIndex = userReports.findIndex(r => r.id === reportId);
    if (rIndex === -1) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (action === "UP") {
      userReports[rIndex].reliabilityScore += 10;
    } else if (action === "DOWN") {
      userReports[rIndex].reliabilityScore -= 10;
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'UP' or 'DOWN'" });
    }

    // Persist
    try {
      fs.writeFileSync(REPORTS_FILE_PATH, JSON.stringify(userReports, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save vote", e);
    }

    res.json({ success: true, updatedScore: userReports[rIndex].reliabilityScore });
  });

  // Vite Integration for Seamless Native Cloud Run Ingress
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Middlewares in Development Mode attached successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static bundle in Production Mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Subway Optimal Boarding Guide fully launched at http://localhost:${PORT}`);
  });
}

startServer();
