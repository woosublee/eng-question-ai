"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { QuestionGeneratorForm } from "@/components/question-generator-form"
import QuestionResults from "@/components/question-results"
import { Storage } from "@/components/storage"
// import { generateQuestion } from '@/lib/openai' // REMOVED: Direct OpenAI call
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
  type: string
  difficulty: "상" | "중" | "하"
  grade: string
  count: number
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
  type: string
  difficulty: "상" | "중" | "하"
  grade: string
  count: number
}

export interface GenerationHistory {
  id: string
  timestamp: Date
  type: string
  difficulty: "상" | "중" | "하"
  grade: string
  count: number
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

// 더미 데이터 생성 함수 (주석 처리)
/*
function createDummyQuestionSets(): SavedQuestionSet[] {
  return [
    {
      id: "1",
      title: "환경 문제",
      savedAt: new Date(),
      difficulty: "중",
      grade: "high-2",
      questions: [
        {
          id: "1-1",
          type: "주제 찾기",
          passage: "Global warming is one of the most pressing issues of our time...",
          questionStatement: "What is the main topic of this passage?",
          options: [
            "The history of climate change",
            "The impact of global warming",
            "Solutions to environmental problems",
            "The role of governments in environmental protection"
          ],
          correctAnswer: 1,
          explanation: "The passage focuses on the effects and consequences of global warming."
        }
      ],
      tags: ["환경", "기후변화"]
    }
  ]
}
*/

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
    console.log("Saving generationResults to local storage:", generationResults)
    localStorage.setItem("generationResults", JSON.stringify(generationResults))
  }, [generationResults])

  const handleHistorySelect = (historyId: string) => {
    const selectedHistory = history.find(item => item.id === historyId)
    if (!selectedHistory) return

    setSelectedHistoryId(historyId)
    setCurrentFormData({
      type: selectedHistory.type,
      difficulty: selectedHistory.difficulty,
      grade: selectedHistory.grade,
      count: selectedHistory.count
    })
    setCurrentView("results")

    // 생성 중인 히스토리를 선택한 경우
    if (selectedHistory.status === "generating") {
      return
    }

    // 이미 생성된 결과가 있는 경우
    const existingResult = generationResults[historyId]
    if (existingResult) {
      return
    }

    // 새로운 생성 요청
    handleGenerate({
      type: selectedHistory.type,
      difficulty: selectedHistory.difficulty,
      grade: selectedHistory.grade,
      count: selectedHistory.count
    })
  }

  const handleGenerate = async (formData: QuestionFormData) => {
    const newHistory: GenerationHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: formData.type,
      difficulty: formData.difficulty,
      grade: formData.grade,
      count: formData.count,
      status: "generating",
    }

    setHistory((prev) => [newHistory, ...prev])
    setSelectedHistoryId(newHistory.id)
    setCurrentView("results")

    try {
      // 각 문항을 개별적으로 생성하는 Promise 배열 생성
      const questionPromises = Array(formData.count).fill(null).map(async (_, index) => {
        try {
          // Call the API Route instead of direct OpenAI function
          const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: formData.type,
              difficulty: formData.difficulty,
              grade: formData.grade,
              count: 1 // Request one question per API call
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch question from API Route');
          }

          const question = await response.json();
          return {
            ...question[0],
            id: `generated-q${Date.now()}-${index}`,
            type: formData.type,
            difficulty: formData.difficulty,
            grade: formData.grade
          }
        } catch (error) {
          console.error(`Error generating question ${index + 1}:`, error)
          return null
        }
      })

      // Promise.allSettled를 사용하여 모든 요청이 완료될 때까지 대기
      const results = await Promise.allSettled(questionPromises)
      
      // 성공적으로 생성된 문항만 필터링
      const successfulQuestions = results
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value)

      setGenerationResults(prev => ({
        ...prev,
        [newHistory.id]: { questions: successfulQuestions }
      }))

      setHistory(prev => 
        prev.map(item => 
          item.id === newHistory.id 
            ? { ...item, status: successfulQuestions.length > 0 ? "completed" : "failed" } 
            : item
        )
      )

      if (successfulQuestions.length === 0) {
        toast({
          title: "문항 생성 실패",
          description: "모든 문항 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          variant: "destructive",
        });
      } else if (successfulQuestions.length < formData.count) {
        toast({
          title: "일부 문항 생성 실패",
          description: `${formData.count}개 중 ${successfulQuestions.length}개의 문항만 생성되었습니다.`, 
          variant: "default",
        });
      } else {
        toast({
          title: "문항 생성 완료",
          description: `${successfulQuestions.length}개의 문항이 성공적으로 생성되었습니다.`, 
        });
      }
    } catch (error) {
      console.error("Error in handleGenerate:", error)
      setHistory(prev => 
        prev.map(item => 
          item.id === newHistory.id 
            ? { ...item, status: "failed" } 
            : item
        )
      )
      toast({
        title: "문항 생성 오류",
        description: "문항 생성 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      })
    }
  }

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
    console.log("🗑️ 삭제 요청:", setId)
    
    // 로컬 스토리지에서 데이터 가져오기
    const existingData = localStorage.getItem("savedQuestionSets")
    const existingSets: SavedQuestionSet[] = existingData ? JSON.parse(existingData) : []
    
    // 해당 세트 삭제
    const updatedSets = existingSets.filter((set) => set.id !== setId)
    
    // 로컬 스토리지 업데이트
    localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets))
    
    // 상태 업데이트
    setSavedQuestionSets(updatedSets)
    console.log("✅ 삭제 후 savedQuestionSets:", updatedSets)
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
    // 히스토리에서 삭제
    setHistory(prev => prev.filter(h => h.id !== historyId))
    
    // 생성 결과에서 삭제
    setGenerationResults(prev => {
      const newResults = { ...prev }
      delete newResults[historyId]
      return newResults
    })

    // 현재 선택된 히스토리가 삭제된 경우 폼으로 돌아가기
    if (selectedHistoryId === historyId) {
      setSelectedHistoryId(null)
      setCurrentView("form")
    }
  }

  const handleQuestionUpdate = (updatedQuestion: SavedQuestion) => {
    console.log('Updating question in parent:', updatedQuestion);
    
    // savedQuestionSets 상태 업데이트
    setSavedQuestionSets(prevSets => {
      const updatedSets = prevSets.map(set => ({
        ...set,
        questions: set.questions.map(q => 
          q.id === updatedQuestion.id ? updatedQuestion : q
        )
      }));
      
      // 로컬 스토리지 업데이트
      localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets));
      console.log('Updated savedQuestionSets in localStorage');
      
      return updatedSets;
    });

    // generationResults 상태 업데이트
    setGenerationResults(prevResults => {
      const updatedResults = { ...prevResults };
      Object.keys(updatedResults).forEach(historyId => {
        const result = updatedResults[historyId];
        if (result) {
          result.questions = result.questions.map(q =>
            q.id === updatedQuestion.id ? updatedQuestion : q
          );
        }
      });
      
      // 로컬 스토리지 업데이트
      localStorage.setItem("generationResults", JSON.stringify(updatedResults));
      console.log('Updated generationResults in localStorage');
      
      return updatedResults;
    });
  }

  // 현재 저장된 세트 수 로깅
  console.log("📊 현재 savedQuestionSets 상태:", savedQuestionSets)

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
