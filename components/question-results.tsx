"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit, Download, Archive, CheckCircle, XCircle, GripVertical, ArrowLeft, RefreshCcw, Loader } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { QuestionFormData, GenerationHistory, SavedQuestion } from "@/app/page"

const EXPORT_FIELDS = [
  { key: "id", label: "문항 ID" },
  { key: "type", label: "유형" },
  { key: "grade", label: "학년" },
  { key: "difficulty", label: "난이도" },
  { key: "questionStatement", label: "발문" },
  { key: "passage", label: "지문" },
  { key: "options", label: "선택지" },
  { key: "correctAnswer", label: "정답" },
  { key: "explanation", label: "해설" },
  { key: "memo", label: "메모" },
];

type QuestionFieldsState = {
  [key: string]: boolean;
  id: boolean;
  type: boolean;
  passage: boolean;
  questionStatement: boolean;
  options: boolean;
  correctAnswer: boolean;
  explanation: boolean;
  difficulty: boolean;
  grade: boolean;
  memo: boolean;
};

interface QuestionResultsProps {
  formData: QuestionFormData | null
  historyItem: GenerationHistory | undefined
  onSaveToStorage: (title: string, questions: SavedQuestion[], tags: string[]) => void
  questions: SavedQuestion[]
  onQuestionUpdate?: (updatedQuestion: SavedQuestion) => void
  totalRequestedCount: number
  onRetry: () => void
  isLoading: boolean
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
  memo?: string
}

declare module "@/components/ui/badge" {
  interface BadgeProps {
    variant?: "default" | "secondary" | "outline" | "destructive"
  }
}

export default function QuestionResults({
  formData,
  historyItem,
  onSaveToStorage,
  questions,
  onQuestionUpdate,
  totalRequestedCount,
  onRetry,
  isLoading
}: QuestionResultsProps) {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState("")
  const [saveTags, setSaveTags] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedQuestion, setEditedQuestion] = useState<GeneratedQuestion | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [exportFormat, setExportFormat] = useState("json")
  const [questionFields, setQuestionFields] = useState<QuestionFieldsState>(
    EXPORT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: true }), {} as QuestionFieldsState)
  )
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  // 유형, 학년, 난이도 옵션
  const QUESTION_TYPES = [
    "목적 찾기",
    "심경의 이해",
    "주장 찾기",
    "밑줄 친 부분의 의미 찾기",
    "요지 찾기",
    "주제 찾기",
    "제목 찾기",
    "도표 및 실용문의 이해",
    "내용 일치 불일치",
    "가리키는 대상이 다른 것 찾기",
    "빈칸 완성하기",
    "흐름에 맞지 않는 문장 찾기",
    "글의 순서 정하기",
    "주어진 문장 넣기",
    "요약문 완성하기",
    "장문의 이해",
    "복합 문단의 이해",
  ];
  const GRADE_OPTIONS = [
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
  ];
  const DIFFICULTY_OPTIONS = ["상", "중", "하"];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [historyItem?.id])

  useEffect(() => {
    setGeneratedQuestions(questions)
  }, [questions])

  const handleEdit = (question: GeneratedQuestion) => {
    setEditingId(question.id)
    setEditedQuestion({ ...question })
  }

  const handleSave = () => {
    if (editedQuestion) {
      // generatedQuestions 상태 업데이트
      setGeneratedQuestions((prev: GeneratedQuestion[]) => {
        const updated = prev.map((q: GeneratedQuestion) => 
          q.id === editedQuestion.id ? editedQuestion : q
        );
        return updated;
      });

      // 부모 컴포넌트에 수정된 문항 전달
      if (onQuestionUpdate) {
        onQuestionUpdate(editedQuestion as SavedQuestion);
      }

      // 로컬 스토리지 직접 업데이트
      try {
        const savedData = localStorage.getItem("savedQuestionSets");
        
        if (savedData) {
          const savedQuestionSets = JSON.parse(savedData);
          
          const updatedSets = savedQuestionSets.map((set: any) => {
            const updatedQuestions = set.questions.map((q: any) =>
              q.id === editedQuestion.id ? editedQuestion : q
            );
            return {
              ...set,
              questions: updatedQuestions
            };
          });

          localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets));
          
          toast({
            title: "저장 완료",
            description: "문항이 성공적으로 저장되었습니다.",
          });
        } else {
        }
      } catch (error) {
        toast({
          title: "저장 실패",
          description: "문항 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
    setEditingId(null);
    setEditedQuestion(null);
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
    const questionsToExport = generatedQuestions.filter((q: GeneratedQuestion) =>
      selectedQuestions.has(q.id)
    )

    const filteredQuestions = questionsToExport.map((q: GeneratedQuestion) => {
      const newQ: Partial<GeneratedQuestion> = {};
      if (questionFields.id) newQ.id = q.id;
      if (questionFields.type) newQ.type = q.type;
      if (questionFields.passage) newQ.passage = q.passage;
      if (questionFields.questionStatement) newQ.questionStatement = q.questionStatement;
      if (questionFields.options) newQ.options = q.options;
      if (questionFields.correctAnswer) newQ.correctAnswer = q.correctAnswer;
      if (questionFields.explanation) newQ.explanation = q.explanation;
      if (questionFields.difficulty) newQ.difficulty = q.difficulty;
      if (questionFields.grade) newQ.grade = q.grade;
      if (questionFields.memo) newQ.memo = q.memo;
      return newQ;
    });

    let fileContent = "";
    let fileName = `exported-questions-${new Date().toISOString().split("T")[0]}`;
    let mimeType = "";

    if (exportFormat === "json") {
      fileContent = JSON.stringify(filteredQuestions, null, 2);
      fileName += ".json";
      mimeType = "application/json";
    } else if (exportFormat === "csv") {
      if (filteredQuestions.length === 0) {
        fileContent = "";
      } else {
        let headers: string[] = [];
        EXPORT_FIELDS.forEach(field => {
          if (questionFields[field.key]) {
            if (field.key === "options") {
              const maxOptions = filteredQuestions.reduce((max, q) => Math.max(max, q.options?.length || 0), 0);
              for (let i = 0; i < maxOptions; i++) {
                headers.push(`선택지 ${i + 1}`);
              }
            } else {
              headers.push(field.label);
            }
          }
        });

        const csvRows = [headers.join(",")];
        filteredQuestions.forEach(q => {
          const row: string[] = [];
          EXPORT_FIELDS.forEach(field => {
            if (questionFields[field.key]) {
              if (field.key === "options") {
                const maxOptions = filteredQuestions.reduce((max, currentQ) => Math.max(max, currentQ.options?.length || 0), 0);
                for (let i = 0; i < maxOptions; i++) {
                  let optionValue = q.options?.[i] || '';
                  if (typeof optionValue === 'string') {
                    optionValue = `"${optionValue.replace(/"/g, '""')}"`;
                  }
                  row.push(optionValue);
                }
              } else {
                let value = (q as any)[field.key];
                if (typeof value === 'string') {
                  value = `"${value.replace(/"/g, '""')}"`;
                } else if (value === null || value === undefined) {
                  value = '';
                }
                row.push(value);
              }
            }
          });
          csvRows.push(row.join(","));
        });
        fileContent = csvRows.join("\n");
        fileName += ".csv";
        mimeType = "text/csv";
      }
    }

    if (fileContent) {
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "내보내기 완료",
        description: `${questionsToExport.length}개 문항이 성공적으로 내보내졌습니다.`, 
      });
    } else {
      toast({
        title: "내보내기 실패",
        description: "내보낼 데이터가 없습니다.",
        variant: "destructive",
      });
    }

    setIsExportDialogOpen(false);
  }

  const handleSaveToStorageClick = () => {
    if (!saveTitle.trim()) {
      toast({
        title: "제목 없음",
        description: "세트 제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (selectedQuestions.size === 0) {
      toast({
        title: "문항 선택 필요",
        description: "저장할 문항을 1개 이상 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    const questionsToSave = generatedQuestions.filter((q: GeneratedQuestion) => selectedQuestions.has(q.id))

    onSaveToStorage(saveTitle, questionsToSave, saveTags.split(",").map(tag => tag.trim()).filter(tag => tag !== ""))
    console.log("handleSaveToStorageClick: Attempting to close dialog by setting isDialogOpen to false.")
    setIsDialogOpen(false)
    setSaveTitle("")
    setSaveTags("")
    setSelectedQuestions(new Set())
    toast({
      title: "저장 완료",
      description: "선택된 문항이 보관함에 저장되었습니다.",
    })
  }

  const getGradeLabel = (gradeValue: string) => {
    switch (gradeValue) {
      case "elementary-3":
        return "초등학교 3학년"
      case "elementary-4":
        return "초등학교 4학년"
      case "elementary-5":
        return "초등학교 5학년"
      case "elementary-6":
        return "초등학교 6학년"
      case "middle-1":
        return "중학교 1학년"
      case "middle-2":
        return "중학교 2학년"
      case "middle-3":
        return "중학교 3학년"
      case "high-1":
        return "고등학교 1학년"
      case "high-2":
        return "고등학교 2학년"
      case "high-3":
        return "고등학교 3학년"
      default:
        return gradeValue
    }
  }

  const isAllSelected = selectedQuestions.size === generatedQuestions.length && generatedQuestions.length > 0
  const isPartiallySelected = selectedQuestions.size > 0 && selectedQuestions.size < generatedQuestions.length

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 px-5 py-3.5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">생성된 문항</h1>
              <p className="text-sm text-gray-500">
                {historyItem?.type} • {historyItem?.difficulty} • {getGradeLabel(historyItem?.grade || "")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={selectedQuestions.size === 0 || isLoading || !formData || !historyItem}>
                  <Download className="w-4 h-4 mr-2" />
                  내보내기 ({selectedQuestions.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>문항 내보내기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">내보내기 형식</label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="json-format" name="export-format" value="json" checked={exportFormat === "json"} onChange={() => setExportFormat("json")} />
                        <Label htmlFor="json-format">JSON</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="csv-format" name="export-format" value="csv" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} />
                        <Label htmlFor="csv-format">CSV</Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">내보낼 문항 데이터</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPORT_FIELDS.map(field => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.key}
                            checked={questionFields[field.key as keyof typeof questionFields]}
                            onCheckedChange={(checked: boolean) =>
                              setQuestionFields(prev => ({ ...prev, [field.key]: checked }))
                            }
                          />
                          <Label htmlFor={field.key}>{field.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleExport} disabled={selectedQuestions.size === 0}>
                    확인
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={selectedQuestions.size === 0 || isLoading || !formData || !historyItem}
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
                      disabled={!saveTitle.trim() || selectedQuestions.size === 0 || isLoading}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 ml-8">
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLInputElement).indeterminate = isPartiallySelected
                }
              }}
              onCheckedChange={handleSelectAll}
              disabled={isLoading}
            />
            <span className="text-sm font-medium text-gray-700">{isAllSelected ? "전체 해제" : "전체 선택"}</span>
          </div>
          {selectedQuestions.size > 0 && (
            <span className="text-sm text-blue-600">{selectedQuestions.size}개 문항 선택됨</span>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 min-h-0 relative">
        <div className="max-w-4xl mx-auto">
          {isLoading && generatedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
              <Loader className="h-12 w-12 mb-4 animate-spin text-blue-500" />
              <p className="text-lg font-semibold text-gray-700">
                문항을 생성 중입니다... ({generatedQuestions.length} / {totalRequestedCount})
              </p>
              <p className="text-sm text-gray-500 mt-2">
                잠시만 기다려 주세요.
              </p>
            </div>
          ) : historyItem?.status === "failed" && !isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-red-50 bg-opacity-70 dark:bg-red-900 dark:bg-opacity-70 text-red-700 dark:text-red-200">
              <XCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-semibold">문항 생성에 실패했습니다.</p>
              <p className="text-sm mt-2">문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
              <Button onClick={onRetry} className="mt-4">
                <RefreshCcw className="w-4 h-4 mr-2" />
                재시도
              </Button>
            </div>
          ) : historyItem?.status === "completed" && generatedQuestions.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-yellow-50 bg-opacity-70 dark:bg-yellow-900 dark:bg-opacity-70 text-yellow-700 dark:text-yellow-200">
              <XCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-semibold">생성된 문항이 없습니다.</p>
              <p className="text-sm mt-2">조건에 맞는 문항을 생성하지 못했습니다.</p>
            </div>
          ) : null}

          {generatedQuestions.length > 0 ? (
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

                      {/* 유형, 학년, 난이도 수정 UI */}
                      <div className="flex gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">유형</label>
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={editedQuestion.type}
                            onChange={e => setEditedQuestion({ ...editedQuestion, type: e.target.value })}
                          >
                            {QUESTION_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">학년</label>
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={editedQuestion.grade}
                            onChange={e => setEditedQuestion({ ...editedQuestion, grade: e.target.value })}
                          >
                            {GRADE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">난이도</label>
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={editedQuestion.difficulty}
                            onChange={e => setEditedQuestion({ ...editedQuestion, difficulty: e.target.value as any })}
                          >
                            {DIFFICULTY_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
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
                          className="w-full break-words"
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

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">해설</label>
                        <Textarea
                          value={editedQuestion.explanation}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEditedQuestion({
                              ...editedQuestion,
                              explanation: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full break-words"
                          placeholder="이 문항의 해설을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">메모 (선택사항)</label>
                        <Textarea
                          value={editedQuestion.memo || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEditedQuestion({
                              ...editedQuestion,
                              memo: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full break-words"
                          placeholder="이 문항에 대한 메모를 입력하세요 (예: 특정 시험 출제, 오답률 높음)"
                        />
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
                        <p className="font-medium text-gray-900 bg-blue-50 p-3 rounded-lg break-words">
                          {question.questionStatement}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">지문</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{question.passage}</p>
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
                              <span className="text-sm flex-1 break-words">{option}</span>
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
                        <p className="text-sm text-blue-800 break-words">{question.explanation}</p>
                      </div>

                      {question.memo && (
                        <Card className="p-4 bg-yellow-50 border-yellow-200">
                          <h3 className="text-sm font-semibold text-yellow-700 mb-2">메모</h3>
                          <p className="text-yellow-800 whitespace-pre-wrap break-words">{question.memo}</p>
                        </Card>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {isLoading && generatedQuestions.length > 0 && (
        <div className="fixed bottom-4 left-[calc(50vw+10rem)] -translate-x-1/2 p-4 border rounded-lg bg-blue-50 bg-opacity-70 dark:bg-blue-900 dark:bg-opacity-70 text-blue-700 dark:text-blue-200 shadow-lg z-50 flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin" />
          <p className="text-sm font-semibold">
            문항 생성 중... ({generatedQuestions.length} / {totalRequestedCount})
          </p>
        </div>
      )}
    </div>
  )
}
