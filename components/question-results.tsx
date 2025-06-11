"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Edit, Download, Archive, CheckCircle, XCircle, GripVertical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { QuestionFormData, GenerationHistory, SavedQuestion } from "@/app/page"
import { generateQuestion } from "@/lib/openai"

interface QuestionResultsProps {
  formData: QuestionFormData | null
  historyItem: GenerationHistory | undefined
  onBackToForm: () => void
  onSaveToStorage: (title: string, questions: SavedQuestion[], tags: string[]) => void
  questions: SavedQuestion[]
}

interface GeneratedQuestion {
  id: string
  type: string
  passage: string
  questionStatement: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: "상" | "중" | "하"
  grade: string
}

declare module "@/components/ui/badge" {
  interface BadgeProps {
    variant?: "default" | "secondary" | "outline" | "destructive"
  }
}

export default function QuestionResults({
  formData,
  historyItem,
  onBackToForm,
  onSaveToStorage,
  questions
}: QuestionResultsProps) {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState("")
  const [saveTags, setSaveTags] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedQuestion, setEditedQuestion] = useState<GeneratedQuestion | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(true)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [historyItem?.id])

  useEffect(() => {
    if (historyItem?.status === "generating") {
      setIsGenerating(true)
      setGeneratedQuestions([])
    } else if (historyItem?.status === "completed" && questions && questions.length > 0) {
      setIsGenerating(false)
      setGeneratedQuestions(questions)
    } else if (historyItem?.status === "failed") {
      setIsGenerating(false)
      setGeneratedQuestions([])
    }
  }, [questions, historyItem])

  const handleEdit = (question: GeneratedQuestion) => {
    setEditingId(question.id)
    setEditedQuestion({ ...question })
  }

  const handleSave = () => {
    if (editedQuestion) {
      setGeneratedQuestions((prev: GeneratedQuestion[]) => prev.map((q: GeneratedQuestion) => (q.id === editedQuestion.id ? editedQuestion : q)))
    }
    setEditingId(null)
    setEditedQuestion(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditedQuestion(null)
  }

  const handleCorrectAnswerChange = (optionIndex: number) => {
    if (editedQuestion) {
      setEditedQuestion({
        ...editedQuestion,
        correctAnswer: optionIndex,
      })
    }
  }

  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuestions)
    if (checked) {
      newSelected.add(questionId)
    } else {
      newSelected.delete(questionId)
    }
    setSelectedQuestions(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(generatedQuestions.map((q: GeneratedQuestion) => q.id))
      setSelectedQuestions(allIds)
    } else {
      setSelectedQuestions(new Set())
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || !editedQuestion) return

    const newOptions = [...editedQuestion.options]
    const draggedOption = newOptions[draggedIndex]

    newOptions.splice(draggedIndex, 1)
    newOptions.splice(dropIndex, 0, draggedOption)

    let newCorrectAnswer = editedQuestion.correctAnswer
    if (editedQuestion.correctAnswer === draggedIndex) {
      newCorrectAnswer = dropIndex
    } else if (draggedIndex < editedQuestion.correctAnswer && dropIndex >= editedQuestion.correctAnswer) {
      newCorrectAnswer = editedQuestion.correctAnswer - 1
    } else if (draggedIndex > editedQuestion.correctAnswer && dropIndex <= editedQuestion.correctAnswer) {
      newCorrectAnswer = editedQuestion.correctAnswer + 1
    }

    setEditedQuestion({
      ...editedQuestion,
      options: newOptions,
      correctAnswer: newCorrectAnswer,
    })

    setDraggedIndex(null)
  }

  const handleExport = () => {
    const exportData = {
      metadata: {
        type: formData?.type,
        difficulty: formData?.difficulty,
        grade: formData?.grade,
        totalQuestions: generatedQuestions.length,
        generatedAt: historyItem?.timestamp,
      },
      questions: generatedQuestions,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `english-questions-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSaveToStorageClick = () => {
    if (!saveTitle.trim()) {
      toast({
        title: "제목을 입력해주세요",
        description: "저장할 문제 세트의 제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (selectedQuestions.size === 0) {
      toast({
        title: "문제를 선택해주세요",
        description: "저장할 문제를 하나 이상 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedQuestionsList = generatedQuestions.filter((q) => selectedQuestions.has(q.id)) as SavedQuestion[]
      const tags = saveTags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0)

      onSaveToStorage(saveTitle.trim(), selectedQuestionsList, tags)
      
      setIsDialogOpen(false)
      setSaveTitle("")
      setSaveTags("")
      setSelectedQuestions(new Set())

      toast({
        title: "저장 완료",
        description: `${selectedQuestionsList.length}개의 문제가 보관함에 저장되었습니다.`,
      })
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "문제를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const getGradeLabel = (gradeValue: string) => {
    const gradeOption = [
      { value: "elementary-3", label: "초등학교 3학년" },
      { value: "elementary-4", label: "초등학교 4학년" },
      { value: "elementary-5", label: "초등학교 5학년" },
      { value: "elementary-6", label: "초등학교 6학년" },
      { value: "middle-1", label: "중학교 1학년" },
      { value: "middle-2", label: "중학교 2학년" },
      { value: "middle-3", label: "중학교 3학년" },
      { value: "high-1", label: "고등학교 1학년" },
      { value: "high-2", label: "고등학교 2학년" },
      { value: "high-3", label: "고등학교 3학년" },
    ].find((option) => option.value === gradeValue)
    return gradeOption?.label || gradeValue
  }

  if (!formData || !historyItem) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">문항 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const isAllSelected = selectedQuestions.size === generatedQuestions.length && generatedQuestions.length > 0
  const isPartiallySelected = selectedQuestions.size > 0 && selectedQuestions.size < generatedQuestions.length

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">생성된 문항</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{getGradeLabel(formData.grade)}</Badge>
              <Badge variant="secondary">난이도: {formData.difficulty}</Badge>
              <Badge variant="outline">총 {generatedQuestions.length}개</Badge>
              <Badge
                variant={historyItem.status === "completed" ? "default" : "secondary"}
                className={historyItem.status === "completed" ? "bg-green-100 text-green-800" : ""}
              >
                {historyItem.status === "completed"
                  ? "생성 완료"
                  : historyItem.status === "generating"
                    ? "생성 중..."
                    : "생성 실패"}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isGenerating}>
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={selectedQuestions.size === 0 || isGenerating}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  보관함에 저장 ({selectedQuestions.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>보관함에 저장</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">저장할 이름</label>
                    <Input
                      value={saveTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveTitle(e.target.value)}
                      placeholder="문항 세트의 이름을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">태그 (선택사항)</label>
                    <Input
                      value={saveTags}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveTags(e.target.value)}
                      placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 수능, 모의고사)"
                    />
                  </div>
                  <div className="text-sm text-gray-600">선택된 문항: {selectedQuestions.size}개</div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      취소
                    </Button>
                    <Button
                      onClick={handleSaveToStorageClick}
                      disabled={!saveTitle.trim() || selectedQuestions.size === 0 || isGenerating}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!isGenerating && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLInputElement).indeterminate = isPartiallySelected
                  }
                }}
                onCheckedChange={handleSelectAll}
                disabled={isGenerating}
              />
              <span className="text-sm font-medium text-gray-700">{isAllSelected ? "전체 해제" : "전체 선택"}</span>
            </div>
            {selectedQuestions.size > 0 && (
              <span className="text-sm text-blue-600">{selectedQuestions.size}개 문항 선택됨</span>
            )}
          </div>
        )}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-4xl mx-auto">
          {isGenerating ? (
            <Card className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">문항을 생성하고 있습니다... ({generatedQuestions.length}/{formData.count})</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {generatedQuestions.map((question: GeneratedQuestion, index: number) => (
                <Card key={question.id} className="p-6">
                  {editingId === question.id && editedQuestion ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">문항 편집</h2>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleCancel}>
                            취소
                          </Button>
                          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                            저장하기
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">발문</label>
                        <Input
                          value={editedQuestion.questionStatement}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditedQuestion({
                              ...editedQuestion,
                              questionStatement: e.target.value,
                            })
                          }
                          className="w-full"
                          placeholder="문제의 발문을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">지문</label>
                        <Textarea
                          value={editedQuestion.passage}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEditedQuestion({
                              ...editedQuestion,
                              passage: e.target.value,
                            })
                          }
                          rows={6}
                          className="w-full"
                          placeholder="지문을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">선택지</label>
                        <div className="space-y-3">
                          {editedQuestion.options.map((option: string, optIndex: number) => (
                            <div
                              key={optIndex}
                              draggable
                              onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, optIndex)}
                              onDragOver={handleDragOver}
                              onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, optIndex)}
                              className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                                draggedIndex === optIndex
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 cursor-move">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 flex-shrink-0 w-6">
                                  {optIndex + 1}.
                                </span>
                              </div>
                              <Input
                                value={option}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const newOptions = [...editedQuestion.options]
                                  newOptions[optIndex] = e.target.value
                                  setEditedQuestion({
                                    ...editedQuestion,
                                    options: newOptions,
                                  })
                                }}
                                className="flex-1"
                                placeholder={`선택지 ${optIndex + 1}을 입력하세요`}
                              />
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {editedQuestion.correctAnswer === optIndex ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <span className="text-sm font-medium">정답</span>
                                    <CheckCircle className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCorrectAnswerChange(optIndex)}
                                    className="flex items-center gap-1 text-gray-400 hover:text-green-600 transition-colors"
                                  >
                                    <span className="text-sm">오답</span>
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          좌측 = 아이콘을 드래그하여 선택지 순서를 변경할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedQuestions.has(question.id)}
                            onCheckedChange={(checked: boolean) => handleQuestionSelect(question.id, checked)}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">문제 {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {question.type}
                            </Badge>
                            <Badge variant="outline">{getGradeLabel(question.grade)}</Badge>
                            <Badge variant="outline">{question.difficulty}</Badge>
                          </div>
                        </div>

                        <Button variant="outline" size="sm" onClick={() => handleEdit(question)}>
                          <Edit className="w-4 h-4 mr-1" />
                          수정
                        </Button>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">발문</h3>
                        <p className="font-medium text-gray-900 bg-blue-50 p-3 rounded-lg">
                          {question.questionStatement}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">지문</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed">{question.passage}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">선택지</h3>
                        <div className="space-y-2">
                          {question.options.map((option: string, optIndex: number) => (
                            <div
                              key={optIndex}
                              className={`flex items-start gap-2 p-3 rounded-lg border ${
                                optIndex === question.correctAnswer
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <span className="text-sm font-medium text-gray-600 mt-0.5 flex-shrink-0">
                                {optIndex + 1}.
                              </span>
                              <span className="text-sm flex-1">{option}</span>
                              {optIndex === question.correctAnswer && (
                                <Badge variant="default" className="bg-green-600 flex-shrink-0">
                                  정답
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">해설</h3>
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
