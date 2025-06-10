"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus } from "lucide-react"
import type { QuestionFormData } from "@/app/page"

interface QuestionGeneratorFormProps {
  onGenerate: (data: QuestionFormData) => void
}

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
]

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
]

export function QuestionGeneratorForm({ onGenerate }: QuestionGeneratorFormProps) {
  const [difficulty, setDifficulty] = useState<"상" | "중" | "하">("중")
  const [grade, setGrade] = useState<string>("")
  const [questionTypes, setQuestionTypes] = useState(
    QUESTION_TYPES.map((type) => ({
      type,
      count: 1,
      selected: false,
    })),
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleDifficultyChange = (newDifficulty: "상" | "중" | "하") => {
    setDifficulty(newDifficulty)
    setHasUnsavedChanges(true)
  }

  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade)
    setHasUnsavedChanges(true)
  }

  const handleQuestionTypeToggle = (index: number) => {
    setQuestionTypes((prev) => prev.map((qt, i) => (i === index ? { ...qt, selected: !qt.selected } : qt)))
    setHasUnsavedChanges(true)
  }

  const handleCountChange = (index: number, delta: number) => {
    setQuestionTypes((prev) =>
      prev.map((qt, i) => (i === index ? { ...qt, count: Math.max(1, Math.min(20, qt.count + delta)) } : qt)),
    )
    setHasUnsavedChanges(true)
  }

  const getTotalCount = () => {
    return questionTypes.filter((qt) => qt.selected).reduce((sum, qt) => sum + qt.count, 0)
  }

  const isValidForm = () => {
    const selectedTypes = questionTypes.filter((qt) => qt.selected)
    const totalCount = getTotalCount()
    return selectedTypes.length > 0 && totalCount <= 20 && grade !== ""
  }

  const handleSubmit = () => {
    if (!isValidForm()) return

    onGenerate({
      difficulty,
      grade,
      questionTypes,
    })
    setHasUnsavedChanges(false)
  }

  const getButtonText = () => {
    if (grade === "") return "학년을 선택해주세요"
    if (questionTypes.filter((qt) => qt.selected).length === 0) return "문항 유형을 선택해주세요"
    if (getTotalCount() > 20) return "최대 20개까지 생성 가능합니다"
    return "다음"
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 상단 헤더 영역 - 고정 */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">문항 생성</h1>
          <Button
            onClick={handleSubmit}
            disabled={!isValidForm()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed px-8 py-2 text-base font-medium"
          >
            {getButtonText()}
          </Button>
        </div>
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-white shadow-sm">
            {/* 학년 선택 */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-700 mb-4">학년</h2>
              <Select value={grade} onValueChange={handleGradeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="학년을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 난이도 선택 */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-700 mb-4">난이도</h2>
              <div className="flex gap-2">
                {(["하", "중", "상"] as const).map((level) => (
                  <Button
                    key={level}
                    variant={difficulty === level ? "default" : "outline"}
                    onClick={() => handleDifficultyChange(level)}
                    className={`px-8 py-2 ${
                      difficulty === level
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* 유형별 문제 선택 */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-700 mb-4">유형별 문제</h2>
              <div className="space-y-3">
                {questionTypes.map((qt, index) => (
                  <div
                    key={qt.type}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={qt.selected}
                        onCheckedChange={() => handleQuestionTypeToggle(index)}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{qt.type}</span>
                    </div>

                    {qt.selected && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCountChange(index, -1)}
                          disabled={qt.count <= 1}
                          className="w-8 h-8 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{qt.count}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCountChange(index, 1)}
                          disabled={qt.count >= 20 || getTotalCount() >= 20}
                          className="w-8 h-8 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 총 문항 수 표시 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">총 문항 수</span>
                <span className={`text-sm font-bold ${getTotalCount() > 20 ? "text-red-500" : "text-blue-600"}`}>
                  {getTotalCount()} / 20
                </span>
              </div>
              {getTotalCount() > 20 && <p className="text-xs text-red-500 mt-1">최대 20개까지 생성 가능합니다.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
