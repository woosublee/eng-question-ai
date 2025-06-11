"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus } from "lucide-react"
import type { QuestionFormData } from "@/app/page"
import { Input } from "@/components/ui/input"

interface QuestionGeneratorFormProps {
  onGenerate: (data: {
    types: Array<{
      type: string;
      count: number;
    }>;
    difficulty: "상" | "중" | "하";
    grade: string;
  }) => void;
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
  const [grade, setGrade] = useState("")
  const [difficulty, setDifficulty] = useState<"상" | "중" | "하">("중")
  const [questionTypes, setQuestionTypes] = useState(
    QUESTION_TYPES.map(type => ({
      type,
      selected: false,
      count: 1
    }))
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

  const handleGradeChange = (value: string) => {
    setGrade(value)
    setHasUnsavedChanges(true)
  }

  const handleDifficultyChange = (level: "상" | "중" | "하") => {
    setDifficulty(level)
    setHasUnsavedChanges(true)
  }

  const handleTypeSelection = (type: string) => {
    setQuestionTypes(prev =>
      prev.map(qt => {
        if (qt.type === type) {
          const newSelected = !qt.selected;
          return {
            ...qt,
            selected: newSelected,
            count: newSelected ? 1 : qt.count
          };
        }
        return qt;
      })
    );
    setHasUnsavedChanges(true);
  }

  const handleCountChange = (type: string, delta: number) => {
    setQuestionTypes(prev =>
      prev.map(qt =>
        qt.type === type
          ? { ...qt, count: Math.max(1, qt.count + delta) }
          : qt
      )
    )
    setHasUnsavedChanges(true)
  }

  const handleDirectCountChange = (type: string, value: string) => {
    setQuestionTypes(prev => {
      if (value === "") {
        return prev.map(qt => (qt.type === type ? { ...qt, count: 0 } : qt));
      }

      let newCount = parseInt(value, 10);
      if (isNaN(newCount)) {
        newCount = 1;
      }
      newCount = Math.max(1, Math.min(newCount, 20));

      const totalCountOfOtherSelectedTypes = prev
        .filter(qt => qt.type !== type && qt.selected)
        .reduce((sum, qt) => sum + qt.count, 0);

      const maxAllowedForCurrentType = 20 - totalCountOfOtherSelectedTypes;

      if (newCount > maxAllowedForCurrentType) {
        newCount = Math.max(1, maxAllowedForCurrentType);
      }

      return prev.map(qt =>
        qt.type === type
          ? { ...qt, count: newCount }
          : qt
      );
    });
    setHasUnsavedChanges(true);
  }

  const getTotalCount = () => {
    return questionTypes
      .filter(qt => qt.selected)
      .reduce((sum, qt) => sum + (qt.count === 0 ? 0 : qt.count), 0);
  }

  const isValidForm = () => {
    return (
      grade !== "" &&
      questionTypes.some(qt => qt.selected) &&
      getTotalCount() <= 20
    )
  }

  const handleSubmit = () => {
    if (!isValidForm()) return

    const selectedTypes = questionTypes
      .filter(qt => qt.selected)
      .map(qt => ({
        type: qt.type,
        count: Math.max(1, qt.count)
      }))

    onGenerate({
      types: selectedTypes,
      difficulty,
      grade,
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
    <div className="flex-1 flex flex-col h-full">
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
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
              <h2 className="text-lg font-medium text-gray-700 mb-4">문제 유형</h2>
              <div className="space-y-3">
                {questionTypes.map((qt) => (
                  <div
                    key={qt.type}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 h-[52px]"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={qt.selected}
                        onCheckedChange={() => handleTypeSelection(qt.type)}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!qt.selected && getTotalCount() >= 20}
                      />
                      <span className={`text-sm font-medium text-gray-700 ${!qt.selected && getTotalCount() >= 20 ? "opacity-50" : ""}`}>{qt.type}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 w-[100px] justify-end transition-opacity duration-200 min-h-[28px] ${
                        qt.selected ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCountChange(qt.type, -1)}
                        disabled={qt.count <= 1}
                        className="h-7 w-7"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={qt.count === 0 ? "" : qt.count.toString()}
                        onChange={(e) => handleDirectCountChange(qt.type, e.target.value)}
                        onBlur={() => {
                          if (qt.count === 0) {
                            setQuestionTypes(prev =>
                              prev.map(item =>
                                item.type === qt.type ? { ...item, selected: false } : item
                              )
                            );
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className="w-10 text-center text-sm p-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        min={1}
                        max={20}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCountChange(qt.type, 1)}
                        disabled={getTotalCount() >= 20}
                        className="h-7 w-7"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
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
