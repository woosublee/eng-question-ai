"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { QuestionGeneratorForm } from "@/components/question-generator-form"
import QuestionResults from "@/components/question-results"
import { Storage } from "@/components/storage"

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

export interface GenerationHistory {
  id: string
  timestamp: Date
  difficulty: string
  grade: string
  questionTypes: Array<{
    type: string
    count: number
  }>
  totalCount: number
  status: "completed" | "generating" | "failed"
}

export interface QuestionFormData {
  difficulty: "상" | "중" | "하"
  grade: string
  questionTypes: Array<{
    type: string
    count: number
    selected: boolean
  }>
}

export interface SavedQuestion {
  id: string
  type: string
  passage: string
  questionStatement: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface SavedQuestionSet {
  id: string
  title: string
  savedAt: Date
  difficulty: string
  grade: string
  questions: SavedQuestion[]
  tags: string[]
}

// 더미 데이터 생성
const createDummyQuestionSets = (): SavedQuestionSet[] => {
  return [
    {
      id: "dummy-1",
      title: "수능 기출 빈칸추론 문제집",
      savedAt: new Date(2024, 11, 1),
      difficulty: "상",
      grade: "high-3",
      tags: ["수능", "기출", "빈칸추론"],
      questions: [
        {
          id: "q1",
          type: "빈칸 완성하기",
          passage:
            "The concept of emotional intelligence has gained significant attention in recent years. Unlike traditional intelligence, which focuses on cognitive abilities, emotional intelligence involves the ability to recognize, understand, and manage emotions effectively. Research has shown that individuals with high emotional intelligence tend to have better relationships, perform better at work, and experience greater overall well-being.",
          questionStatement: "다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?",
          options: [
            "cognitive abilities are more important than emotional skills",
            "emotional intelligence is just as valuable as traditional intelligence",
            "managing emotions is impossible without proper training",
            "relationships have no connection to intelligence levels",
            "well-being depends solely on academic achievements",
          ],
          correctAnswer: 1,
          explanation:
            "이 글은 감정지능이 전통적인 지능과 다르지만 그에 못지않게 중요하다는 내용을 다루고 있습니다. 감정지능이 높은 사람들이 더 나은 관계를 맺고, 직장에서 더 좋은 성과를 내며, 전반적인 웰빙을 경험한다는 연구 결과를 제시하고 있습니다.",
        },
        {
          id: "q2",
          type: "빈칸 완성하기",
          passage:
            "Climate change is one of the most pressing issues of our time. The increasing concentration of greenhouse gases in the atmosphere is causing global temperatures to rise, leading to melting ice caps, rising sea levels, and extreme weather events. Scientists agree that immediate action is needed to reduce carbon emissions and transition to renewable energy sources.",
          questionStatement: "다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?",
          options: [
            "climate change is a natural phenomenon that cannot be controlled",
            "greenhouse gases have no impact on global temperatures",
            "immediate action is required to address environmental challenges",
            "renewable energy is too expensive to implement globally",
            "extreme weather events are unrelated to human activities",
          ],
          correctAnswer: 2,
          explanation:
            "이 글은 기후변화의 심각성과 온실가스 증가로 인한 다양한 환경 문제들을 설명하며, 탄소 배출 감소와 재생에너지로의 전환을 위한 즉각적인 행동이 필요하다고 강조하고 있습니다.",
        },
      ],
    },
    {
      id: "dummy-2",
      title: "중학교 영어 독해 연습",
      savedAt: new Date(2024, 10, 15),
      difficulty: "중",
      grade: "middle-2",
      tags: ["중학교", "독해", "연습"],
      questions: [
        {
          id: "q3",
          type: "주제 찾기",
          passage:
            "Reading books is one of the most beneficial activities for students. It helps improve vocabulary, enhances critical thinking skills, and provides knowledge about different cultures and perspectives. Regular reading also improves concentration and reduces stress levels.",
          questionStatement: "다음 글의 주제로 가장 적절한 것은?",
          options: [
            "the importance of vocabulary building",
            "benefits of reading for students",
            "different types of books to read",
            "how to improve concentration skills",
            "ways to reduce stress in daily life",
          ],
          correctAnswer: 1,
          explanation:
            "이 글은 독서가 학생들에게 주는 다양한 이점들(어휘력 향상, 비판적 사고력 증진, 문화적 지식 습득, 집중력 향상, 스트레스 감소)에 대해 설명하고 있습니다.",
        },
      ],
    },
  ]
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"form" | "results" | "storage">("form")
  const [history, setHistory] = useState<GenerationHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [currentFormData, setCurrentFormData] = useState<QuestionFormData | null>(null)
  // 더미 데이터로 초기화
  const [savedQuestionSets, setSavedQuestionSets] = useState<SavedQuestionSet[]>(createDummyQuestionSets())

  const handleGenerate = (formData: QuestionFormData) => {
    const newHistory: GenerationHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      difficulty: formData.difficulty,
      grade: formData.grade,
      questionTypes: formData.questionTypes.filter((qt) => qt.selected),
      totalCount: formData.questionTypes.filter((qt) => qt.selected).reduce((sum, qt) => sum + qt.count, 0),
      status: "generating",
    }

    setHistory((prev) => [newHistory, ...prev])
    setSelectedHistoryId(newHistory.id)
    setCurrentFormData(formData)
    setCurrentView("results")

    // Simulate generation completion
    setTimeout(() => {
      setHistory((prev) => prev.map((h) => (h.id === newHistory.id ? { ...h, status: "completed" as const } : h)))
    }, 2000)
  }

  const handleHistorySelect = (historyId: string) => {
    setSelectedHistoryId(historyId)
    const selectedHistory = history.find((h) => h.id === historyId)
    if (selectedHistory) {
      // Create form data from history for display
      const formDataFromHistory: QuestionFormData = {
        difficulty: selectedHistory.difficulty as "상" | "중" | "하",
        grade: selectedHistory.grade,
        questionTypes: QUESTION_TYPES.map((type) => {
          const historyType = selectedHistory.questionTypes.find((qt) => qt.type === type)
          return {
            type,
            count: historyType?.count || 1,
            selected: !!historyType,
          }
        }),
      }
      setCurrentFormData(formDataFromHistory)
      setCurrentView("results")
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
    // 현재 선택된 히스토리 아이템에서 난이도와 학년 정보를 가져옵니다
    const selectedHistory = history.find((h) => h.id === selectedHistoryId)
    
    const newQuestionSet: SavedQuestionSet = {
      id: Date.now().toString(),
      title,
      savedAt: new Date(),
      difficulty: selectedHistory?.difficulty || currentFormData?.difficulty || "중",
      grade: selectedHistory?.grade || currentFormData?.grade || "high-3",
      questions,
      tags,
    }

    // 로컬 스토리지에서 기존 데이터 가져오기
    const existingData = localStorage.getItem("savedQuestionSets")
    const existingSets: SavedQuestionSet[] = existingData ? JSON.parse(existingData) : []
    
    // 새로운 세트 추가
    const updatedSets = [newQuestionSet, ...existingSets]
    
    // 로컬 스토리지에 저장
    localStorage.setItem("savedQuestionSets", JSON.stringify(updatedSets))
    
    // 상태 업데이트
    setSavedQuestionSets(updatedSets)
    
    // 보관함으로 이동
    setCurrentView("storage")
  }

  // 컴포넌트 마운트 시 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem("savedQuestionSets")
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      // Date 객체로 변환
      const formattedData = parsedData.map((set: any) => ({
        ...set,
        savedAt: new Date(set.savedAt)
      }))
      setSavedQuestionSets(formattedData)
    }
  }, [])

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

  // 현재 저장된 세트 수 로깅
  console.log("📊 현재 savedQuestionSets 상태:", savedQuestionSets)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        history={history}
        selectedHistoryId={selectedHistoryId}
        onHistorySelect={handleHistorySelect}
        onNewGeneration={handleBackToForm}
        onGoToStorage={handleGoToStorage}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === "form" ? (
          <QuestionGeneratorForm onGenerate={handleGenerate} />
        ) : currentView === "results" ? (
          <QuestionResults
            formData={currentFormData}
            historyItem={history.find((h) => h.id === selectedHistoryId)}
            onBackToForm={handleBackToForm}
            onSaveToStorage={handleSaveToStorage}
          />
        ) : (
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
