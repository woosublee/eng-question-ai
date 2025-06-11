"use client"

import { Plus, Clock, CheckCircle, AlertCircle, Loader, Archive, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { GenerationHistory } from "@/app/page"

interface SidebarProps {
  history: GenerationHistory[]
  selectedHistoryId: string | null
  onHistorySelect: (id: string) => void
  onNewGeneration: () => void
  onGoToStorage: () => void
  onDeleteHistory: (id: string) => void
}

export function Sidebar({ 
  history, 
  selectedHistoryId, 
  onHistorySelect, 
  onNewGeneration, 
  onGoToStorage,
  onDeleteHistory 
}: SidebarProps) {
  const getStatusIcon = (status: GenerationHistory["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "generating":
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getGradeLabel = (gradeValue: string) => {
    const gradeLabels: Record<string, string> = {
      "elementary-3": "초3",
      "elementary-4": "초4",
      "elementary-5": "초5",
      "elementary-6": "초6",
      "middle-1": "중1",
      "middle-2": "중2",
      "middle-3": "중3",
      "high-1": "고1",
      "high-2": "고2",
      "high-3": "고3",
    }
    return gradeLabels[gradeValue] || gradeValue
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="flex-shrink-0 p-5 border-b border-gray-200">
        <Button onClick={onNewGeneration} className="w-full bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          새 문항 생성
        </Button>
      </div>

      <div className="flex-shrink-0 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Clock className="w-4 h-4" />
          생성 히스토리
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-4 overflow-y-auto">
          <div className="space-y-2 pb-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">아직 생성된 문항이 없습니다.</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors group relative ${
                    selectedHistoryId === item.id
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => onHistorySelect(item.id)}
                >
                  <div 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteHistory(item.id)
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-500 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm font-medium">
                          {getGradeLabel(item.grade)} • 난이도: {item.difficulty}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(item.timestamp)}</span>
                    </div>

                    <div className="text-xs text-gray-600 mb-1">총 {item.count}개 문항</div>

                    <div className="text-xs text-gray-500">
                      {item.type}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <Button onClick={onGoToStorage} variant="outline" className="w-full">
          <Archive className="w-4 h-4 mr-2" />
          보관함
        </Button>
      </div>
    </div>
  )
}
