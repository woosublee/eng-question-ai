"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { QuestionGeneratorForm } from "@/components/question-generator-form"
import QuestionResults from "@/components/question-results"
import { Storage } from "@/components/storage"
import { QuestionSet } from '@/types/question'
import { toast } from "@/components/ui/use-toast"

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

interface QuestionGenerationParams {
  types: Array<{
    type: string;
    count: number;
  }>;
  difficulty: "상" | "중" | "하";
  grade: string;
}

interface GenerationResult {
  questions: Array<{
    id: string
    type: string
    difficulty: "상" | "중" | "하"
    grade: string
    passage: string
    questionStatement: string
    options: string[]
    correctAnswer: number
    explanation: string
  }>
}

export interface QuestionFormData {
  types: Array<{
    type: string;
    count: number;
  }>;
  difficulty: "상" | "중" | "하";
  grade: string;
}

export interface GenerationHistory {
  id: string
  timestamp: Date
  type: string
  difficulty: "상" | "중" | "하"
  grade: string
  count: number // Total requested count for this history item
  status: "generating" | "completed" | "failed"
}

export interface SavedQuestion {
  id: string
  type: string
  difficulty: "상" | "중" | "하"
  grade: string
  passage: string
  questionStatement: string
  options: string[]
  correctAnswer: number
  explanation: string
  memo?: string
}

export interface SavedQuestionSet {
  id: string
  title: string
  questions: SavedQuestion[]
  savedAt: Date
  tags: string[]
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"form" | "results" | "storage">("form")
  const [history, setHistory] = useState<GenerationHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [currentFormData, setCurrentFormData] = useState<QuestionFormData | null>(null)
  const [savedQuestionSets, setSavedQuestionSets] = useState<SavedQuestionSet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [generationResults, setGenerationResults] = useState<Record<string, GenerationResult>>({})

  // 컴포넌트 마운트 시 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    // 저장된 문제 세트 로드
    const savedData = localStorage.getItem("savedQuestionSets")
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      const formattedData = parsedData.map((set: any) => ({
        ...set,
        savedAt: new Date(set.savedAt)
      }))
      setSavedQuestionSets(formattedData)
    }

    // 생성 히스토리 로드
    const historyData = localStorage.getItem("generationHistory")
    if (historyData) {
      const parsedHistory = JSON.parse(historyData)
      const formattedHistory = parsedHistory.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }))
      setHistory(formattedHistory)
    }

    // 생성 결과 로드
    const resultsData = localStorage.getItem("generationResults")
    if (resultsData) {
      setGenerationResults(JSON.parse(resultsData))
    }
  }, [])

  // 히스토리 상태가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem("generationHistory", JSON.stringify(history))
  }, [history])

  // 생성 결과가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem("generationResults", JSON.stringify(generationResults))
  }, [generationResults])

  const handleHistorySelect = (historyId: string) => {
    const selectedHistory = history.find(item => item.id === historyId)
    if (!selectedHistory) return

    setSelectedHistoryId(historyId)
    setCurrentFormData({
      types: [{ type: selectedHistory.type, count: selectedHistory.count }],
      difficulty: selectedHistory.difficulty,
      grade: selectedHistory.grade
    })
    setCurrentView("results")

    // 생성 중인 히스토리를 선택한 경우
    if (selectedHistory.status === "generating") {
      // 이미 진행 중인 경우, 현재 상태를 유지하고 추가 요청을 보내지 않음
      return
    }

    // 이미 생성된 결과가 있는 경우
    const existingResult = generationResults[historyId]
    if (existingResult) {
      // 이미 결과가 있으면 해당 결과를 보여주고 종료
      return
    }

    // 새로운 생성 요청
    handleGenerate({
      types: [{ type: selectedHistory.type, count: selectedHistory.count }],
      difficulty: selectedHistory.difficulty,
      grade: selectedHistory.grade
    })
  }

  const handleGenerate = async (formData: QuestionFormData) => {
    const newHistory: GenerationHistory = {
      id: `history-${Date.now()}`,
      type: formData.types.map(t => t.type).join(", "),
      difficulty: formData.difficulty,
      grade: formData.grade,
      count: formData.types.reduce((sum, t) => sum + t.count, 0),
      timestamp: new Date(),
      status: "generating"
    };

    try {
      setHistory(prev => [newHistory, ...prev]);
      setCurrentView("results");
      setSelectedHistoryId(newHistory.id);
      setCurrentFormData(formData);

      // Call the API Route
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch questions from API Route');
      }

      const questions = await response.json();
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('API Route did not return valid questions.');
      }

      const generatedQuestions = questions.map((question, index) => ({
        ...question,
        id: `generated-q${Date.now()}-${newHistory.id}-${index}`,
        difficulty: formData.difficulty,
        grade: formData.grade,
        memo: ""
      }));

      setGenerationResults(prev => ({
        ...prev,
        [newHistory.id]: { questions: generatedQuestions }
      }));

      setHistory(prev =>
        prev.map(item =>
          item.id === newHistory.id
            ? { ...item, status: "completed" }
            : item
        )
      );

      toast({
        title: "문항 생성 완료",
        description: `${generatedQuestions.length}개의 문항이 성공적으로 생성되었습니다.`,
      });
    } catch (error) {
      console.error("Error in handleGenerate:", error);
      setHistory(prev =>
        prev.map(item =>
          item.id === newHistory.id
            ? { ...item, status: "failed" }
            : item
        )
      );
      toast({
        title: "문항 생성 오류",
        description: "문항 생성 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  const handleBackToForm = () => {
    setCurrentView("form")
    setSelectedHistoryId(null)
  }

  const handleGoToStorage = () => {
    setCurrentView("storage")
  }

  const handleSaveToStorage = (title: string, questions: SavedQuestion[], tags: string[] = []) => {
    const newSet: SavedQuestionSet = {
      id: Date.now().toString(),
      title,
      questions,
      savedAt: new Date(),
      tags
    }

    setSavedQuestionSets((prev) => [newSet, ...prev])
    localStorage.setItem("savedQuestionSets", JSON.stringify([newSet, ...savedQuestionSets]))
    toast({
      title: "저장 완료",
      description: "문제가 보관함에 저장되었습니다.",
    })
  }

  const handleDeleteFromStorage = (setId: string) => {
    // 로컬 스토리지에서 데이터 가져오기
    const existingData = localStorage.getItem("savedQuestionSets")
    const existingSets: SavedQuestionSet[] = existingData ? JSON.parse(existingData) : []
    
    // 해당 세트 삭제
    const updatedSets = existingSets.filter((set) => set.id !== setId)
    
    // 로컬 스토리지 업데이트
    localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets))
    
    // 상태 업데이트
    setSavedQuestionSets(updatedSets)
  }

  const handleUpdateStorage = (setId: string, updatedSet: SavedQuestionSet) => {
    // 로컬 스토리지에서 데이터 가져오기
    const existingData = localStorage.getItem("savedQuestionSets")
    const existingSets: SavedQuestionSet[] = existingData ? JSON.parse(existingData) : []
    
    // 해당 세트 업데이트
    const updatedSets = existingSets.map((set) => (set.id === setId ? updatedSet : set))
    
    // 로컬 스토리지 업데이트
    localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets))
    
    // 상태 업데이트
    setSavedQuestionSets(updatedSets)
  }

  const handleDeleteHistory = (historyId: string) => {
    const updatedHistory = history.filter(item => item.id !== historyId)
    setHistory(updatedHistory)

    // 생성 결과도 함께 삭제
    const updatedResults = { ...generationResults }
    delete updatedResults[historyId]
    setGenerationResults(updatedResults)
  }

  const handleQuestionUpdate = (updatedQuestion: SavedQuestion) => {
    setGenerationResults(prevResults => {
      const newResults = { ...prevResults };
      if (selectedHistoryId && newResults[selectedHistoryId]) {
        newResults[selectedHistoryId] = {
          ...newResults[selectedHistoryId],
          questions: newResults[selectedHistoryId].questions.map(q =>
            q.id === updatedQuestion.id ? updatedQuestion : q
          )
        };
      }
      return newResults;
    });
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        history={history}
        selectedHistoryId={selectedHistoryId}
        onHistorySelect={handleHistorySelect}
        onNewGeneration={() => setCurrentView("form")}
        onGoToStorage={() => setCurrentView("storage")}
        onDeleteHistory={handleDeleteHistory}
      />
      <main className="flex-1 overflow-y-auto min-h-0">
        {currentView === "form" && (
          <QuestionGeneratorForm onGenerate={handleGenerate} />
        )}
        {currentView === "results" && (
          <QuestionResults
            formData={currentFormData}
            historyItem={history.find((h) => h.id === selectedHistoryId)}
            onBackToForm={handleBackToForm}
            onSaveToStorage={handleSaveToStorage}
            questions={selectedHistoryId ? (generationResults[selectedHistoryId]?.questions || []) : []}
            onQuestionUpdate={handleQuestionUpdate}
            totalRequestedCount={selectedHistoryId ? (history.find((h) => h.id === selectedHistoryId)?.count || 0) : 0}
          />
        )}
        {currentView === "storage" && (
          <Storage
            questionSets={savedQuestionSets}
            onDelete={handleDeleteFromStorage}
            onUpdate={handleUpdateStorage}
          />
        )}
      </main>
    </div>
  )
}
