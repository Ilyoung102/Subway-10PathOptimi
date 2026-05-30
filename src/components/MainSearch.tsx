/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SearchItem, TransitMode } from "../types";
import { Search, MapPin, Star, History, Mic, MicOff, HelpCircle, ArrowRightLeft, Sparkles, Check, AlertCircle, X } from "lucide-react";

interface MainSearchProps {
  onSearchRoute: (from: SearchItem, to: SearchItem, mode?: TransitMode, exitNumber?: string) => void;
  stationsList: SearchItem[];
}

export default function MainSearch({ onSearchRoute, stationsList }: MainSearchProps) {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [targetExit, setTargetExit] = useState("");
  const [activeInput, setActiveInput] = useState<"FROM" | "TO" | null>(null);
  
  // Search state logic
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [selectedFrom, setSelectedFrom] = useState<SearchItem | null>(null);
  const [selectedTo, setSelectedTo] = useState<SearchItem | null>(null);

  // Natural Language Intent Engine Input
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState("");
  const [aiError, setAiError] = useState("");

  // Recent searches & favorites state (local persistent)
  const [recentSearches, setRecentSearches] = useState<Array<{from: SearchItem, to: SearchItem}>>([]);
  const [favorites, setFavorites] = useState<Array<{from: SearchItem, to: SearchItem}>>([]);

  // Voice recognition mockup states
  const [isListening, setIsListening] = useState(false);
  const [voiceWave, setVoiceWave] = useState<number[]>([10, 10, 10, 10, 10]);

  useEffect(() => {
    // Load history and favorites
    const savedHistory = localStorage.getItem("subway_search_history");
    const savedFavorites = localStorage.getItem("subway_search_favorites");
    if (savedHistory) setRecentSearches(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  const saveToHistory = (from: SearchItem, to: SearchItem) => {
    const fresh = [{ from, to }, ...recentSearches.filter(i => !(i.from.name === from.name && i.to.name === to.name))].slice(0, 5);
    setRecentSearches(fresh);
    localStorage.setItem("subway_search_history", JSON.stringify(fresh));
  };

  const handleToggleFavorite = (from: SearchItem, to: SearchItem) => {
    const isFav = favorites.some(f => f.from.name === from.name && f.to.name === to.name);
    let updated;
    if (isFav) {
      updated = favorites.filter(f => !(f.from.name === from.name && f.to.name === to.name));
    } else {
      updated = [{ from, to }, ...favorites];
    }
    setFavorites(updated);
    localStorage.setItem("subway_search_favorites", JSON.stringify(updated));
  };

  // Live Query filter and search
  const handleQueryChange = (text: string, field: "FROM" | "TO") => {
    if (field === "FROM") {
      setFromQuery(text);
      setSelectedFrom(null);
    } else {
      setToQuery(text);
      setSelectedTo(null);
    }

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    // Fuzzy matching + Line matching + Ota correction
    const cleanText = text.trim().toLowerCase().replace(/\s+/g, "");
    
    // Auto typo matches mapping
    let resolvedQuery = cleanText;
    if (cleanText.includes("강남") || cleanText.includes("간남")) resolvedQuery = "강남";
    if (cleanText.includes("사당") || cleanText.includes("사단")) resolvedQuery = "사당";
    if (cleanText.includes("서울") || cleanText.includes("설역") || cleanText.includes("서을")) resolvedQuery = "서울";
    if (cleanText.includes("국립") || cleanText.includes("박물관") || cleanText.includes("중앙박물")) resolvedQuery = "박물관";

    const filtered = stationsList.filter(item => {
      const matchName = item.name.toLowerCase().replace(/\s+/g, "").includes(resolvedQuery);
      const matchLine = item.lineNames?.some(ln => ln.toLowerCase().includes(text.toLowerCase())) || false;
      return matchName || matchLine;
    });

    const cleanInput = text.trim();
    if (cleanInput.length >= 1) {
      const cleanName = cleanInput.endsWith("역") ? cleanInput.slice(0, -1) : cleanInput;
      // also clean any suffix or leading space
      const nameOnly = cleanName.replace(/\s+/g, "");
      const hasExactMatch = filtered.some(item => 
        item.name.replace("역", "").toLowerCase() === nameOnly.toLowerCase()
      );
      if (!hasExactMatch && nameOnly.length >= 1) {
        filtered.push({
          name: `${nameOnly}역`,
          type: "STATION",
          stationId: `DYNAMIC_${nameOnly}`,
          lat: 37.5657,
          lng: 126.9769,
          lineNames: ["통합 전철망"]
        });
      }
    }

    setSearchResults(filtered);
  };

  const handleSelectItem = (item: SearchItem) => {
    if (activeInput === "FROM") {
      setSelectedFrom(item);
      setFromQuery(item.name + (item.lineNames ? ` (${item.lineNames.join(",")})` : ""));
    } else if (activeInput === "TO") {
      setSelectedTo(item);
      setToQuery(item.name + (item.lineNames ? ` (${item.lineNames.join(",")})` : ""));
    }
    setSearchResults([]);
    setActiveInput(null);
  };

  const handleSwap = () => {
    const tempSel = selectedFrom;
    const tempQuery = fromQuery;

    setSelectedFrom(selectedTo);
    setFromQuery(toQuery);

    setSelectedTo(tempSel);
    setToQuery(tempQuery);
  };

  const handleTriggerSearch = () => {
    if (selectedFrom && selectedTo) {
      saveToHistory(selectedFrom, selectedTo);
      onSearchRoute(selectedFrom, selectedTo, undefined, targetExit);
    }
  };

  // AI powered natural input interpretation
  const handleAiNaturalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return;

    setIsAiSuggesting(true);
    setAiError("");
    try {
      const resp = await fetch("/api/subway/natural-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: naturalQuery })
      });
      const data = await resp.json();
      if (data.success && data.aiAnalysis) {
        const { origin, destination, mode } = data.aiAnalysis;

        // Try to match station list
        let startItem = stationsList.find(s => s.name.startsWith(origin) || origin.startsWith(s.name.replace("역", "")));
        let endItem = stationsList.find(s => s.name.startsWith(destination) || destination.startsWith(s.name.replace("역", "")));

        if (!startItem && origin) {
          const originClean = origin.endsWith("역") ? origin.slice(0, -1) : origin;
          startItem = {
            name: `${originClean}역`,
            type: "STATION",
            stationId: `DYNAMIC_${originClean}`,
            lat: 37.5657,
            lng: 126.9769,
            lineNames: ["통합 전철망"]
          };
        }

        if (!endItem && destination) {
          const destClean = destination.endsWith("역") ? destination.slice(0, -1) : destination;
          endItem = {
            name: `${destClean}역`,
            type: "STATION",
            stationId: `DYNAMIC_${destClean}`,
            lat: 37.5657,
            lng: 126.9769,
            lineNames: ["통합 전철망"]
          };
        }

        if (startItem && endItem) {
          setSelectedFrom(startItem);
          setFromQuery(startItem.name + (startItem.lineNames ? ` (${startItem.lineNames.join(",")})` : ""));
          setSelectedTo(endItem);
          setToQuery(endItem.name + (endItem.lineNames ? ` (${endItem.lineNames.join(",")})` : ""));
          
          saveToHistory(startItem, endItem);
          onSearchRoute(startItem, endItem, mode);
          setNaturalQuery("");
        } else {
          setAiError(`의도를 분석했으나 해당하는 노선을 생성하지 못했습니다. (지정: ${origin} → ${destination})`);
        }
      }
    } catch (err) {
      setAiError("AI 비서 엔진 일시 지연. 정적 오타 교정기로 전환합니다.");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  // Simulated Voice recognition waveform animation and detection
  const handleTriggerVoice = () => {
    if (isListening) {
      setIsListening(false);
      // Mock result output
      setNaturalQuery("강남역에서 국립중앙박물관 갈건데 휠체어 탈 수 있는 길로");
    } else {
      setIsListening(true);
      // Animate waveform
      const interval = setInterval(() => {
        setVoiceWave(Array.from({ length: 5 }, () => Math.floor(Math.random() * 32) + 8));
      }, 150);
      setTimeout(() => {
        clearInterval(interval);
        setIsListening(false);
        setNaturalQuery("강남역에서 서울역까지 캐리어 모드로 찾기");
      }, 3000);
    }
  };

  const isFavorite = (from: SearchItem, to: SearchItem) => {
    return favorites.some(f => f.from.name === from.name && f.to.name === to.name);
  };

  return (
    <div id="main-search-card" className="bg-[#111114] rounded-2xl border border-white/10 p-4 mb-4">
      {/* 1. 상단 두 역 입력 필드 및 스왑 버튼 */}
      <div className="relative flex flex-col gap-2 mb-4">
        <div className="grid grid-cols-12 gap-2">
          {/* Row 1: From Input (col-span-9) and Swap Button (col-span-3) */}
          <div className="relative col-span-9">
            <div className="absolute left-3 top-3.5 flex flex-col items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111114] ring-2 ring-emerald-500/20" />
            </div>
            
            <input
              id="input-from-station"
              type="text"
              placeholder="출발역 또는 장소 입력 (예: 강남)"
              value={fromQuery}
              onFocus={() => setActiveInput("FROM")}
              onChange={(e) => handleQueryChange(e.target.value, "FROM")}
              className="w-full text-sm pl-9 pr-8 py-3 bg-[#1C1C21] border border-white/5 rounded-xl focus:outline-none focus:border-emerald-500/50 transition-all font-medium text-slate-100 placeholder:text-slate-500"
            />

            {fromQuery && (
              <button
                onClick={() => { setFromQuery(""); setSelectedFrom(null); }}
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="col-span-3 flex items-center justify-center">
            <button
              id="btn-swap-stations"
              onClick={handleSwap}
              className="w-full py-3 bg-[#1C1C21] border border-white/10 rounded-xl flex items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-white"
              title="출발지 목적지 교체"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
              <span className="text-[10px] font-bold">교체</span>
            </button>
          </div>

          {/* Row 2: To Input (col-span-9) and Exit Input (col-span-3) */}
          <div className="relative col-span-9">
            <div className="absolute left-3 top-3.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
            </div>
            
            <input
              id="input-to-station"
              type="text"
              placeholder="도착역 또는 박물관/숭례문 등 장소 입력"
              value={toQuery}
              onFocus={() => setActiveInput("TO")}
              onChange={(e) => handleQueryChange(e.target.value, "TO")}
              className="w-full text-sm pl-9 pr-8 py-3 bg-[#1C1C21] border border-white/5 rounded-xl focus:outline-none focus:border-emerald-500/50 transition-all font-medium text-slate-100 placeholder:text-slate-500"
            />

            {toQuery && (
              <button
                onClick={() => { setToQuery(""); setSelectedTo(null); }}
                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative col-span-3 mb-0">
            <input
              id="input-target-exit"
              type="text"
              placeholder="출구(선택)"
              value={targetExit}
              onChange={(e) => setTargetExit(e.target.value)}
              className="w-full text-sm px-1 py-3 bg-[#1C1C21] border border-white/5 rounded-xl focus:outline-none focus:border-emerald-500/50 transition-all font-medium text-slate-100 placeholder:text-slate-500 text-center"
              title="도착지 출구 번호 입력"
            />
          </div>
        </div>
      </div>

      {/* 2. 실시간 검색 추천 리스트 (중복역 노선 구분 보장) */}
      {searchResults.length > 0 && activeInput && (
        <div id="search-results-overlay" className="bg-[#1C1C21] border border-white/10 rounded-xl p-2 mb-4 max-h-[220px] overflow-y-auto space-y-1">
          <div className="text-[10px] text-slate-500 font-bold px-2 py-1 uppercase tracking-wider">검색 추천 결과</div>
          {searchResults.map((item, idx) => (
            <button
              id={`search-item-${idx}`}
              key={idx}
              onClick={() => handleSelectItem(item)}
              className="w-full text-left px-3 py-2.5 bg-[#111114] border border-white/5 hover:border-emerald-500/30 hover:bg-[#1C1C21] rounded-lg flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                {item.type === "STATION" ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111114] ring-2 ring-emerald-500/20" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                )}
                <div>
                  <span className="font-semibold text-slate-200 text-xs">{item.name}</span>
                  {item.lineNames && (
                    <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded ml-1.5 font-bold border border-white/5">
                      {item.lineNames.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {item.type === "STATION" ? "역 코드 자동매핑" : "주변 출구안내"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 3. 메인 길찾기 추천 격발 버튼 */}
      <div className="flex gap-2 mb-4">
        <button
          id="btn-execute-route-search"
          onClick={handleTriggerSearch}
          disabled={!selectedFrom || !selectedTo}
          className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            selectedFrom && selectedTo
              ? "bg-emerald-500 text-black shadow-sm hover:bg-emerald-400"
              : "bg-white/5 border border-white/5 text-slate-600 cursor-not-allowed"
          }`}
        >
          <Search className="w-4 h-4" />
          승하차 최적 연계 경로 검색하기
        </button>

        {selectedFrom && selectedTo && (
          <button
            onClick={() => handleToggleFavorite(selectedFrom, selectedTo)}
            className={`p-3 border rounded-xl transition-all ${
              isFavorite(selectedFrom, selectedTo) 
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                : "border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="즐겨찾기 추가/해제"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>

      {/* 4. AI 기반 자연어 목적지 질문 입력창 */}
      <div className="border-t border-white/5 pt-3">
        <form onSubmit={handleAiNaturalSubmit} className="relative">
          <div className="absolute left-3 top-3">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          
          <input
            id="ai-natural-query-input"
            type="text"
            placeholder="AI 스마트 플래너: '사당에서 서울역 휠체어 전용'"
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-22 py-2.5 bg-[#1C1C21] border border-white/5 rounded-xl focus:outline-none focus:border-emerald-500/50 text-slate-100 font-medium placeholder:text-slate-500"
          />

          <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
            {/* Voice Mic 버튼 */}
            <button
              type="button"
              onClick={handleTriggerVoice}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${
                isListening ? "text-emerald-400 bg-emerald-500/15" : "text-slate-400"
              }`}
              title="음성으로 목적지 지시"
            >
              {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
            <button
              id="btn-ai-natural-search-submit"
              type="submit"
              disabled={isAiSuggesting || !naturalQuery.trim()}
              className="bg-emerald-500 text-black font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-emerald-400 disabled:bg-white/5 disabled:text-slate-600 transition-all"
            >
              Q&A 탐색
            </button>
          </div>
        </form>

        {/* Voice Wave Animation */}
        {isListening && (
          <div className="mt-2 flex items-center justify-center gap-1.5 bg-emerald-500/10 rounded-lg py-1.5 border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-400 animate-pulse mr-2">목소리를 인식 중입니다:</span>
            {voiceWave.map((h, index) => (
              <span
                key={index}
                className="w-1 bg-emerald-500 rounded-full transition-all duration-150"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        )}

        {isAiSuggesting && (
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 bg-[#1C1C21] p-2 rounded-lg border border-white/5">
            <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full" />
            <span>Gemini AI 비서가 최적 경로 문맥(출발지, 모드)을 분석하고 있습니다...</span>
          </div>
        )}

        {aiError && (
          <div className="text-[10px] text-rose-400 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}
      </div>

      {/* 5. 최근 검색 기록 & 즐겨찾기 탭 */}
      {(recentSearches.length > 0 || favorites.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-1.5">
                <History className="w-3 h-3" />
                최근 경로 기록
              </div>
              <div className="space-y-1">
                {recentSearches.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedFrom(item.from);
                      setFromQuery(item.from.name + (item.from.lineNames ? ` (${item.from.lineNames.join(",")})` : ""));
                      setSelectedTo(item.to);
                      setToQuery(item.to.name + (item.to.lineNames ? ` (${item.to.lineNames.join(",")})` : ""));
                      onSearchRoute(item.from, item.to);
                    }}
                    className="w-full text-left p-1.5 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 rounded text-[10px] block truncate text-slate-300 transition-all"
                  >
                    {item.from.name.replace("역", "")} → {item.to.name.replace("역", "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {favorites.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-1.5">
                <Star className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                나의 즐겨찾기
              </div>
              <div className="space-y-1">
                {favorites.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedFrom(item.from);
                      setFromQuery(item.from.name + (item.from.lineNames ? ` (${item.from.lineNames.join(",")})` : ""));
                      setSelectedTo(item.to);
                      setToQuery(item.to.name + (item.to.lineNames ? ` (${item.to.lineNames.join(",")})` : ""));
                      onSearchRoute(item.from, item.to);
                    }}
                    className="w-full text-left p-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded text-[10px] block truncate text-emerald-400 font-medium transition-all"
                  >
                    ★ {item.from.name.replace("역", "")} → {item.to.name.replace("역", "")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
