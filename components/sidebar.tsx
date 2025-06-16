"use client"

import { Plus, Clock, CheckCircle, AlertCircle, Loader, Archive, X, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { GenerationHistory } from "@/app/page"
import { useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

interface SidebarProps {
  history: GenerationHistory[]
  selectedHistoryId: string | null
  onHistorySelect: (id: string) => void
  onNewGeneration: () => void
  onGoToStorage: () => void
  onDeleteHistory: (id: string) => void
  onTitleEdit?: (id: string, newTitle: string) => void
}

export function Sidebar({ 
  history, 
  selectedHistoryId, 
  onHistorySelect, 
  onNewGeneration, 
  onGoToStorage,
  onDeleteHistory,
  onTitleEdit
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const [popoverOpenId, setPopoverOpenId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

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
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover open={popoverOpenId === item.id} onOpenChange={open => setPopoverOpenId(open ? item.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:text-blue-500 hover:bg-blue-50"
                          onClick={() => setPopoverOpenId(item.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-32 p-1">
                        <button
                          className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 rounded"
                          onClick={() => {
                            setEditingId(item.id)
                            setEditingTitle(item.title || "")
                            setPopoverOpenId(null)
                          }}
                        >이름 바꾸기</button>
                        <button
                          className="w-full text-left text-xs px-3 py-2 hover:bg-red-50 text-red-600 rounded"
                          onClick={() => {
                            setDeleteTargetId(item.id)
                            setPopoverOpenId(null)
                          }}
                        >삭제</button>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {editingId === item.id ? (
                          <input
                            className="font-bold text-base text-gray-900 bg-white border border-blue-300 rounded px-1 py-0.5 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editingTitle}
                            autoFocus
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={() => {
                              if (editingTitle.trim() && editingTitle !== item.title) {
                                onTitleEdit && onTitleEdit(item.id, editingTitle.trim())
                              }
                              setEditingId(null)
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                if (editingTitle.trim() && editingTitle !== item.title) {
                                  onTitleEdit && onTitleEdit(item.id, editingTitle.trim())
                                }
                                setEditingId(null)
                              } else if (e.key === "Escape") {
                                setEditingId(null)
                                setEditingTitle("")
                              }
                            }}
                          />
                        ) : (
                          <span className="font-bold text-base text-gray-900">
                            {item.title
                              ? item.title.length > 10
                                ? item.title.slice(0, 10) + '...'
                                : item.title
                              : '타이틀'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                      <span>{getGradeLabel(item.grade)} • 난이도: {item.difficulty}</span>
                      <span className="text-gray-500">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="text-xs text-gray-500">{item.type}</div>
                    <div className="text-xs text-gray-500">총 {item.count}개 문항</div>
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

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제할까요?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-gray-600">삭제하면 복구할 수 없습니다.</div>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTargetId) { onDeleteHistory(deleteTargetId); setDeleteTargetId(null); } }}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
