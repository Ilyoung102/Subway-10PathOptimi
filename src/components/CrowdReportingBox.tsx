/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserReport } from "../types";
import { Sliders, CheckSquare, PlusCircle, ThumbsUp, ThumbsDown, Info, Calendar, User, Check, Send } from "lucide-react";

interface CrowdReportingBoxProps {
  stationId?: string;
  stationName?: string;
}

export default function CrowdReportingBox({ stationId, stationName }: CrowdReportingBoxProps) {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Submit Form States
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [reportType, setReportType] = useState<string>("CROWD_INFO");
  const [content, setContent] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = stationId 
        ? `/api/subway/reports?stationId=${stationId}` 
        : "/api/subway/reports";
      const res = await fetch(url);
      const data = await res.json();
      setReports(data);
    } catch (e) {
      console.error("Failed to fetch reports", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [stationId]);

  const handleVote = async (reportId: string, action: "UP" | "DOWN") => {
    try {
      const res = await fetch(`/api/subway/report/${reportId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        // Update local report score
        setReports(prev => prev.map(r => {
          if (r.id === reportId) {
            return { ...r, reliabilityScore: data.updatedScore };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error("Failed to vote report", err);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const currentStationId = stationId || "205"; // fallback to 강남
    const currentStationName = stationName || "강남";

    try {
      const res = await fetch("/api/subway/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: currentStationId,
          stationName: currentStationName,
          type: reportType,
          content: content.trim(),
          reportedBy: reporterName.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setContent("");
        setReporterName("");
        setShowSubmitForm(false);
        setSuccessMsg("제보가 정상 접수되었습니다! 집계 시스템 신뢰성 검토 후 적용됩니다.");
        setTimeout(() => setSuccessMsg(""), 4000);
        fetchReports();
      }
    } catch (ex) {
      console.error("Failed to submit report", ex);
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "ELEVATOR_INSPECT":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "STAIRS_CLOSED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "CROWD_INFO":
        return "bg-sky-500/10 text-sky-450 text-sky-400 border-sky-500/20";
      case "DOOR_RECOMMEND":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-white/5 text-slate-300 border-white/5";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "ELEVATOR_INSPECT": return "엘리베이터 임시 점검";
      case "STAIRS_CLOSED": return "계단/에스컬레이터 폐쇄";
      case "CROWD_INFO": return "시간대 혼잡 통보";
      case "DOOR_RECOMMEND": return "최적 문 변경 제안";
      default: return "기타 편의 정보";
    }
  };

  return (
    <div id="crowd-reporting-component" className="bg-[#111114] rounded-2xl border border-white/10 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-500" />
            {stationName ? `${stationName}역 제보 마켓` : "실시간 지하철 제보통"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">승하차 칸 변경, 점검 등 시민들이 직접 올리는 최신 정보망</p>
        </div>
        <button
          id="btn-trigger-report-form"
          onClick={() => setShowSubmitForm(!showSubmitForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          시민제보 하기
        </button>
      </div>

      {successMsg && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {showSubmitForm && (
        <form onSubmit={handleSubmitReport} className="mb-4 p-3 bg-[#1C1C21] rounded-xl border border-white/5 transition-all">
          <h4 className="font-bold text-white text-xs mb-2">실시간 지하철 제보 작성</h4>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">제보 대상 역</label>
              <input
                type="text"
                disabled
                value={stationName ? `${stationName}역 (현재역)` : "강남역 (기준)"}
                className="w-full text-xs p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">항목 분류</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-xs p-2 bg-[#111114] border border-white/10 rounded-lg text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="CROWD_INFO">혼잡도 정보</option>
                <option value="ELEVATOR_INSPECT">엘리베이터 현황</option>
                <option value="STAIRS_CLOSED">통로/계단 점검</option>
                <option value="DOOR_RECOMMEND">승차문 위치 제안</option>
                <option value="OTHER">기타 건의 사항</option>
              </select>
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-[10px] text-slate-400 mb-1 font-medium">제보 설명</label>
            <textarea
              required
              rows={2}
              placeholder="예: 7-2번 문 혼잡이 너무 심하니 9-3번 문도 에스컬레이터와 가깝다는 꿀팁 제안합니다."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#111114] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-200 resize-none leading-relaxed"
            />
          </div>

          <div className="flex gap-2 mb-2">
            <div className="w-1/2">
              <label className="block text-[10px] text-slate-400 mb-0.5">제보자 별명 (선택)</label>
              <input
                type="text"
                placeholder="지하철전문가"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full text-xs p-2 bg-[#111114] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-1.5 mt-3">
            <button
              type="button"
              onClick={() => setShowSubmitForm(false)}
              className="px-3 py-1.5 text-slate-400 text-xs font-medium bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              제보 등록
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-6 text-xs text-slate-500 font-mono">데이터를 집계하고 있습니다...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-5 border border-dashed border-white/5 rounded-xl">
          <Info className="w-5 h-5 text-slate-500 mx-auto mb-1" />
          <p className="text-xs text-slate-400">등록된 유저 제보가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {reports.map((report) => (
            <div
              id={`report-item-${report.id}`}
              key={report.id}
              className="p-3 bg-[#1C1C21] border border-white/5 rounded-xl text-xs transition-hover hover:border-white/10"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(report.type)}`}>
                    {getTypeText(report.type)}
                  </span>
                  <span className="font-extrabold text-white">@{report.stationName}역</span>
                </div>
                
                {/* 신뢰 레벨 UI */}
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  신뢰 점수: 
                  <span className={report.reliabilityScore >= 100 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {report.reliabilityScore}점
                  </span>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed mb-2 break-all">{report.content}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <User className="w-3.5 h-3.5" />
                    {report.reportedBy}
                  </span>
                  <span className="flex items-center gap-0.5 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(report.createdAt).toLocaleDateString("ko-KR", { hour: "numeric", minute: "numeric" })}
                  </span>
                </div>

                {/* 투표 액션 버튼 */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 mr-1">도움이 되었나요?</span>
                  <button
                    id={`btn-vote-up-${report.id}`}
                    onClick={() => handleVote(report.id, "UP")}
                    className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-emerald-400 transition-all flex items-center cursor-pointer"
                    title="신뢰합니다 (점수 증가)"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    id={`btn-vote-down-${report.id}`}
                    onClick={() => handleVote(report.id, "DOWN")}
                    className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-red-400 transition-all flex items-center cursor-pointer"
                    title="의심스럽습니다 (점수 차감)"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
