"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Search, Trash2, Eye, Download, Calendar, BookOpen, Tag, Edit, ListFilter, CheckCircle, XCircle, GripVertical, PanelRightOpen, ChevronRight, Expand, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SavedQuestionSet, SavedQuestion } from "@/app/page"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { SheetTitle } from "@/components/ui/sheet"

interface StorageProps {
  questionSets: SavedQuestionSet[]
  onDelete: (setId: string) => void
  onUpdate: (setId: string, updatedSet: SavedQuestionSet) => void
  onHistorySelect?: () => void
}

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
]

type QuestionFieldsState = {
  [key: string]: boolean
  id: boolean
  type: boolean
  passage: boolean
  questionStatement: boolean
  options: boolean
  correctAnswer: boolean
  explanation: boolean
  difficulty: boolean
  grade: boolean
  memo: boolean
}

export function Storage({ questionSets, onDelete, onUpdate, onHistorySelect }: StorageProps) {
  // getMaxDrawerWidth를 먼저 선언
  const getMaxDrawerWidth = () => {
    if (typeof window !== "undefined") {
      return Math.floor(window.innerWidth * 2 / 3)
    }
    return 800
  }
  const { toast } = useToast()
  // 컴포넌트 렌더링 시 전달받은 데이터 확인

  const [searchTerm, setSearchTerm] = useState("")
  const [filterGrade, setFilterGrade] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [selectedSet, setSelectedSet] = useState<SavedQuestionSet | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedSet, setEditedSet] = useState<SavedQuestionSet | null>(null)
  const [tagInputValue, setTagInputValue] = useState<string>('')
  const [isComposing, setIsComposing] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState("json")
  const [questionFields, setQuestionFields] = useState<QuestionFieldsState>(
    EXPORT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: true }), {} as QuestionFieldsState)
  )
  const [currentView, setCurrentView] = useState<"set" | "question-card" | "question-table">("set")
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editedQuestion, setEditedQuestion] = useState<SavedQuestion | null>(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [openDrawerQuestionId, setOpenDrawerQuestionId] = useState<string | null>(null)
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("questionDrawerWidth")
      return saved ? parseInt(saved, 10) : 480
    }
    return 480
  })
  const drawerResizing = useRef(false)
  const [isDrawerMax, setIsDrawerMax] = useState(false)
  const defaultDrawerWidth = 480
  const maxDrawerWidth = getMaxDrawerWidth()

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    drawerResizing.current = true
    document.body.style.cursor = "ew-resize"
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!drawerResizing.current) return
      const maxWidth = getMaxDrawerWidth()
      let newWidth = Math.min(Math.max(window.innerWidth - moveEvent.clientX, 320), maxWidth)
      setDrawerWidth(newWidth)
      setIsDrawerMax(newWidth >= maxWidth - 2) // 2px 오차 허용
    }
    const onMouseUp = () => {
      drawerResizing.current = false
      document.body.style.cursor = ""
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  // 드로어 width localStorage 저장
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("questionDrawerWidth", String(drawerWidth))
    }
  }, [drawerWidth])

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

  const filteredSets = questionSets.filter((set) => {
    const matchesSearch =
      set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesGrade = filterGrade === "all" || set.questions[0]?.grade === filterGrade
    const matchesDifficulty = filterDifficulty === "all" || set.questions[0]?.difficulty === filterDifficulty

    return matchesSearch && matchesGrade && matchesDifficulty
  })

  // 모든 문항을 단일 배열로 평탄화
  const allQuestions: SavedQuestion[] = questionSets.flatMap(set => 
    set.questions.map(q => ({ 
      ...q, 
      // 문항 단위 뷰에서 내보내기 시 필요한 메타데이터 추가
      parentSetTitle: set.title,
      parentSetSavedAt: set.savedAt,
      parentSetTags: set.tags
    }))
  );

  const filteredQuestions = allQuestions.filter(question => {
    const matchesSearch = 
      question.questionStatement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.passage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.options.some(option => option.toLowerCase().includes(searchTerm.toLowerCase())) ||
      question.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.parentSetTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.parentSetTags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGrade = filterGrade === "all" || question.grade === filterGrade;
    const matchesDifficulty = filterDifficulty === "all" || question.difficulty === filterDifficulty;

    return matchesSearch && matchesGrade && matchesDifficulty;
  });

  const handleViewDetails = (set: SavedQuestionSet) => {
    setSelectedSet(set)
    setEditedSet(set)
    setIsEditMode(false)
    setIsDetailOpen(true)
    setTagInputValue('')
  }

  const handleEdit = () => {
    setIsEditMode(true)
  }

  const handleSave = () => {
    if (!editedSet) return

    // 제목이 비어있는지 확인
    if (!editedSet.title.trim()) {
      toast({
        title: "제목을 입력해주세요",
        description: "문제 세트의 제목은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    try {
      onUpdate(editedSet.id, editedSet)
      setIsEditMode(false)
      setSelectedSet(editedSet)
      toast({
        title: "수정 완료",
        description: "문제 세트가 성공적으로 수정되었습니다.",
      })
    } catch (error) {
      toast({
        title: "수정 실패",
        description: "문제 세트를 수정하는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setEditedSet(selectedSet)
    setIsEditMode(false)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // 다이얼로그가 닫힐 때 수정 모드라면 취소 처리
      if (isEditMode) {
        handleCancel()
      }
      setIsDetailOpen(false)
      setTagInputValue('')
    }
  }

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInputValue(e.target.value);
  };

  const handleAddTagOnBlur = () => {
    if (isComposing || !editedSet || !tagInputValue.trim()) return; 

    // Robust normalization and cleaning of the input string
    // Allow only alphanumeric, Korean characters, and spaces. Remove all other characters.
    const cleanedInputValue = tagInputValue
      .normalize('NFC') // Normalize Unicode characters
      .replace(/\u200B/g, '') // Remove Zero Width Space
      .replace(/\u00A0/g, ' ') // Replace Non-breaking space with regular space
      .replace(/[^a-zA-Z0-9가-힣 ]/g, '') // Remove any character that is not alphanumeric, Korean, or space
      .replace(/\s\s+/g, ' ') // Replace multiple spaces with a single space
      .trim(); // Trim leading/trailing whitespace again after cleaning

    let tagsToAdd: string[] = [];

    // If the cleaned input contains a space, split by it. Otherwise, treat as a single tag.
    if (cleanedInputValue.includes(' ')) {
      tagsToAdd = cleanedInputValue.split(' ')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else {
      // If no space, and it's not empty, add it as a single tag
      if (cleanedInputValue.length > 0) {
        tagsToAdd = [cleanedInputValue];
      }
    }

    const uniqueNewTags = tagsToAdd.filter(tag => !editedSet.tags.includes(tag));

    if (editedSet) {
      setEditedSet(prev => ({
        ...prev!,
        tags: [...(prev?.tags || []), ...uniqueNewTags]
      }));
    }
    setTagInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) { // Only process Enter if not composing
      e.preventDefault(); // Prevent form submission
      handleAddTagOnBlur(); // Use the same logic as blur
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!editedSet) return;
    setEditedSet(prev => ({
      ...prev!,
      tags: prev!.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleExportSet = (set: SavedQuestionSet | null) => {
    if (!set) {
      toast({
        title: "내보내기 실패",
        description: "선택된 문제 세트가 없습니다.",
        variant: "destructive",
      });
      setIsExportDialogOpen(false);
      return;
    }

    const questionsToExport = set.questions;

    const filteredQuestions = questionsToExport.map((q: SavedQuestion) => {
      const newQ: Partial<SavedQuestion> = {};
      EXPORT_FIELDS.forEach(field => {
        if (questionFields[field.key]) {
          if (field.key === "options") {
            newQ.options = q.options;
          } else {
            (newQ as any)[field.key] = (q as any)[field.key];
          }
        }
      });
      return newQ;
    });

    let fileContent = "";
    let fileName = `${set.title}-exported-${new Date().toISOString().split("T")[0]}`;
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
              const maxOptions = questionsToExport.reduce((max, q) => Math.max(max, q.options?.length || 0), 0);
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
                const maxOptions = questionsToExport.reduce((max, currentQ) => Math.max(max, currentQ.options?.length || 0), 0);
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
  };

  // 문항별 보기에서 문항 수정 저장
  const handleQuestionSave = () => {
    if (!editedQuestion) return;
    // 해당 문항이 속한 세트 찾기
    const setId = questionSets.find(set => set.questions.some(q => q.id === editedQuestion.id))?.id;
    if (!setId) return;
    const updatedSets = questionSets.map(set =>
      set.id === setId
        ? { ...set, questions: set.questions.map(q => q.id === editedQuestion.id ? editedQuestion : q) }
        : set
    );
    onUpdate(setId, updatedSets.find(set => set.id === setId)!);
    setEditingQuestionId(null);
    setEditedQuestion(null);
    toast({ title: "저장 완료", description: "문항이 성공적으로 저장되었습니다." });
  };
  const handleQuestionCancel = () => {
    setEditingQuestionId(null);
    setEditedQuestion(null);
  };

  // 선택/전체선택 체크박스 핸들러
  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev)
      if (checked) newSet.add(questionId)
      else newSet.delete(questionId)
      return newSet
    })
  }
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)))
    } else {
      setSelectedQuestionIds(new Set())
    }
  }
  const isAllSelected = selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0
  const isPartiallySelected = selectedQuestionIds.size > 0 && selectedQuestionIds.size < filteredQuestions.length

  // 선택 삭제
  const handleDeleteSelectedQuestions = () => {
    // 각 문항이 속한 세트별로 그룹핑
    const setMap = new Map<string, SavedQuestionSet>()
    questionSets.forEach(set => setMap.set(set.id, { ...set }))
    selectedQuestionIds.forEach(qid => {
      for (const set of setMap.values()) {
        set.questions = set.questions.filter(q => q.id !== qid)
      }
    })
    // 실제로 변경된 세트만 업데이트
    setMap.forEach((set, setId) => {
      onUpdate(setId, set)
    })
    setSelectedQuestionIds(new Set())
    setIsDeleteDialogOpen(false)
    toast({ title: "삭제 완료", description: "선택한 문항이 삭제되었습니다." })
  }

  // 선택 문항 내보내기
  const handleExportSelectedQuestions = () => {
    const questionsToExport = filteredQuestions.filter(q => selectedQuestionIds.has(q.id))
    const filteredExportQuestions = questionsToExport.map(q => {
      const newQ: Partial<SavedQuestion> = {}
      if (questionFields.id) newQ.id = q.id
      if (questionFields.type) newQ.type = q.type
      if (questionFields.passage) newQ.passage = q.passage
      if (questionFields.questionStatement) newQ.questionStatement = q.questionStatement
      if (questionFields.options) newQ.options = q.options
      if (questionFields.correctAnswer) newQ.correctAnswer = q.correctAnswer
      if (questionFields.explanation) newQ.explanation = q.explanation
      if (questionFields.difficulty) newQ.difficulty = q.difficulty
      if (questionFields.grade) newQ.grade = q.grade
      if (questionFields.memo) newQ.memo = q.memo
      return newQ
    })
    let fileContent = ""
    let fileName = `exported-questions-${new Date().toISOString().split("T")[0]}`
    let mimeType = ""
    if (exportFormat === "json") {
      fileContent = JSON.stringify(filteredExportQuestions, null, 2)
      fileName += ".json"
      mimeType = "application/json"
    } else if (exportFormat === "csv") {
      if (filteredExportQuestions.length === 0) {
        fileContent = ""
      } else {
        let headers: string[] = []
        EXPORT_FIELDS.forEach(field => {
          if (questionFields[field.key]) {
            if (field.key === "options") {
              const maxOptions = filteredExportQuestions.reduce((max, q) => Math.max(max, q.options?.length || 0), 0)
              for (let i = 0; i < maxOptions; i++) {
                headers.push(`선택지 ${i + 1}`)
              }
            } else {
              headers.push(field.label)
            }
          }
        })
        const csvRows = [headers.join(",")]
        filteredExportQuestions.forEach(q => {
          const row: string[] = []
          EXPORT_FIELDS.forEach(field => {
            if (questionFields[field.key]) {
              if (field.key === "options") {
                const maxOptions = filteredExportQuestions.reduce((max, currentQ) => Math.max(max, currentQ.options?.length || 0), 0)
                for (let i = 0; i < maxOptions; i++) {
                  let optionValue = q.options?.[i] || ''
                  if (typeof optionValue === 'string') {
                    optionValue = `"${optionValue.replace(/"/g, '""')}"`
                  }
                  row.push(optionValue)
                }
              } else {
                let value = (q as any)[field.key]
                if (typeof value === 'string') {
                  value = `"${value.replace(/"/g, '""')}"`
                } else if (value === null || value === undefined) {
                  value = ''
                }
                row.push(value)
              }
            }
          })
          csvRows.push(row.join(","))
        })
        fileContent = csvRows.join("\n")
        fileName += ".csv"
        mimeType = "text/csv"
      }
    }
    if (fileContent) {
      const blob = new Blob([fileContent], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "내보내기 완료", description: `${questionsToExport.length}개 문항이 성공적으로 내보내졌습니다.` })
    } else {
      toast({ title: "내보내기 실패", description: "내보낼 데이터가 없습니다.", variant: "destructive" })
    }
    setIsExportDialogOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* 상단 헤더 영역 - 고정 */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">보관함</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4" />총 {questionSets.length}개 세트 •{" "}
              {questionSets.reduce((sum, set) => sum + set.questions.length, 0)}개 문항
            </div>
            <div className="flex rounded-md shadow-sm">
              <Button
                variant={currentView === "set" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("set")}
                className="rounded-r-none"
              >
                세트별 보기
              </Button>
              <Button
                variant={currentView === "question-card" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("question-card")}
                className="border-l-0"
              >
                문항별(카드)
              </Button>
              <Button
                variant={currentView === "question-table" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("question-table")}
                className="rounded-l-none border-l-0"
              >
                문항별(테이블)
              </Button>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="제목이나 태그로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="학년 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 학년</SelectItem>
              <SelectItem value="elementary-3">초등학교 3학년</SelectItem>
              <SelectItem value="elementary-4">초등학교 4학년</SelectItem>
              <SelectItem value="elementary-5">초등학교 5학년</SelectItem>
              <SelectItem value="elementary-6">초등학교 6학년</SelectItem>
              <SelectItem value="middle-1">중학교 1학년</SelectItem>
              <SelectItem value="middle-2">중학교 2학년</SelectItem>
              <SelectItem value="middle-3">중학교 3학년</SelectItem>
              <SelectItem value="high-1">고등학교 1학년</SelectItem>
              <SelectItem value="high-2">고등학교 2학년</SelectItem>
              <SelectItem value="high-3">고등학교 3학년</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="난이도" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 난이도</SelectItem>
              <SelectItem value="하">하</SelectItem>
              <SelectItem value="중">중</SelectItem>
              <SelectItem value="상">상</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {currentView === "set" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSets.length === 0 ? (
                <div className="text-center py-12 col-span-full">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {questionSets.length === 0 ? "아직 저장된 문항이 없습니다." : "검색 결과가 없습니다."}
                  </p>
                  {questionSets.length === 0 && (
                    <p className="text-sm text-gray-400">문항을 생성하고 보관함에 저장해보세요.</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">전체 저장된 세트 수: {questionSets.length}</p>
                </div>
              ) : (
                filteredSets.map((set) => (
                  <Card key={set.id} className="p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2 truncate">{set.title}</h2>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {set.questions[0]?.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getGradeLabel(set.questions[0]?.grade)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            난이도: {set.questions[0]?.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="w-4 h-4" />
                        <span>{set.questions.length}개 문항</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(set.savedAt).toLocaleDateString()}</span>
                      </div>
                      {set.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {set.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {set.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{set.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(set)}>
                        <Eye className="w-4 h-4" />
                        보기
                      </Button>
                      
                      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
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
                            <Button onClick={() => handleExportSet(set)}>
                              확인
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(set.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {currentView === "question-card" && (
            <div className="space-y-6">
              {/* 전체 선택 체크박스 & 선택 삭제 버튼 */}
              <div className="flex items-center gap-4 mb-2">
                <Checkbox
                  checked={isAllSelected}
                  ref={el => { if (el) (el as HTMLInputElement).indeterminate = isPartiallySelected }}
                  onCheckedChange={checked => {
                    if (typeof checked !== 'boolean') return;
                    handleSelectAll(checked);
                  }}
                  disabled={filteredQuestions.length === 0}
                />
                <span className="text-sm">전체 선택</span>
                <div className="flex-1" />
                {selectedQuestionIds.size > 0 && (
                  <>
                    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          내보내기
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
                          <Button onClick={handleExportSelectedQuestions} disabled={selectedQuestionIds.size === 0}>
                            확인
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                      선택 삭제 ({selectedQuestionIds.size})
                    </Button>
                  </>
                )}
              </div>
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {allQuestions.length === 0 ? "아직 저장된 문항이 없습니다." : "검색 결과가 없습니다."}
                  </p>
                  {allQuestions.length === 0 && (
                    <p className="text-sm text-gray-400">문항을 생성하고 보관함에 저장해보세요.</p>
                  )}
                </div>
              ) : (
                filteredQuestions.map((question, index) => (
                  <Card key={question.id} className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedQuestionIds.has(question.id)}
                        onCheckedChange={checked => {
                          if (typeof checked !== 'boolean') return;
                          handleQuestionSelect(question.id, checked);
                        }}
                      />
                      <span className="text-sm font-medium text-gray-500">문제 {index + 1}</span>
                      <Badge variant="secondary" className="text-xs">{question.type}</Badge>
                      <Badge variant="outline" className="text-xs">{getGradeLabel(question.grade)}</Badge>
                      <Badge variant="outline" className="text-xs">난이도: {question.difficulty}</Badge>
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200">세트: {question.parentSetTitle}</Badge>
                      <div className="flex-1" />
                      <Button variant="outline" size="sm" onClick={() => {
                        setOpenDrawerQuestionId(question.id);
                        setEditingQuestionId(question.id);
                        setEditedQuestion({ ...question });
                      }}>
                        <Eye className="w-4 h-4 mr-1" />
                        보기
                      </Button>
                    </div>
                    {editingQuestionId === question.id && editedQuestion ? (
                      <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingTop: '56px' }}>
                        {(() => {
                          const q = filteredQuestions.find(q => q.id === openDrawerQuestionId)
                          if (!q) return null
                          return (
                            <div className="max-w-lg mx-auto p-6">
                              <div className="mb-6">
                                <h2 className="text-xl font-bold mb-4">문항 수정</h2>
                                <div className="mb-4">
                                  <Label htmlFor="type">유형</Label>
                                  <Select
                                    value={editedQuestion?.type || ''}
                                    onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, type: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="객관식">객관식</SelectItem>
                                      <SelectItem value="주관식">주관식</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="grade">학년</Label>
                                  <Select
                                    value={editedQuestion?.grade || ''}
                                    onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, grade: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="학년 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="초1">초등 1학년</SelectItem>
                                      <SelectItem value="초2">초등 2학년</SelectItem>
                                      <SelectItem value="초3">초등 3학년</SelectItem>
                                      <SelectItem value="초4">초등 4학년</SelectItem>
                                      <SelectItem value="초5">초등 5학년</SelectItem>
                                      <SelectItem value="초6">초등 6학년</SelectItem>
                                      <SelectItem value="중1">중등 1학년</SelectItem>
                                      <SelectItem value="중2">중등 2학년</SelectItem>
                                      <SelectItem value="중3">중등 3학년</SelectItem>
                                      <SelectItem value="고1">고등 1학년</SelectItem>
                                      <SelectItem value="고2">고등 2학년</SelectItem>
                                      <SelectItem value="고3">고등 3학년</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="difficulty">난이도</Label>
                                  <Select
                                    value={editedQuestion?.difficulty || ''}
                                    onValueChange={(value: "상" | "중" | "하") => setEditedQuestion(prev => prev ? { ...prev, difficulty: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="난이도 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="상">상</SelectItem>
                                      <SelectItem value="중">중</SelectItem>
                                      <SelectItem value="하">하</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="questionStatement">발문</Label>
                                  <Textarea
                                    id="questionStatement"
                                    value={editedQuestion.questionStatement || ''}
                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, questionStatement: e.target.value } : null)}
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="passage">지문</Label>
                                  <Textarea
                                    id="passage"
                                    value={editedQuestion.passage || ''}
                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, passage: e.target.value } : null)}
                                    className="min-h-[200px]"
                                  />
                                </div>
                                <div className="mb-4">
                                  <Label>선택지</Label>
                                  <div className="space-y-2">
                                    {editedQuestion.options.map((option, index) => (
                                      <div key={index} className="flex gap-2">
                                        <Input
                                          value={option}
                                          onChange={(e) => {
                                            const newOptions = [...(editedQuestion.options || [])]
                                            newOptions[index] = e.target.value
                                            setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                          }}
                                        />
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => {
                                            const newOptions = [...(editedQuestion.options || []).filter((_, i) => i !== index)]
                                            setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const newOptions = [...(editedQuestion.options || []), '']
                                        setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                      }}
                                    >
                                      선택지 추가
                                    </Button>
                                  </div>
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="correctAnswer">정답</Label>
                                  <Select
                                    value={String(editedQuestion?.correctAnswer)}
                                    onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, correctAnswer: Number(value) } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="정답 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {editedQuestion?.options.map((_, index) => (
                                        <SelectItem key={index} value={String(index)}>
                                          {index + 1}번
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="explanation">해설</Label>
                                  <Textarea
                                    id="explanation"
                                    value={editedQuestion.explanation || ''}
                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div className="mb-4">
                                  <Label htmlFor="memo">메모</Label>
                                  <Textarea
                                    id="memo"
                                    value={editedQuestion.memo || ''}
                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, memo: e.target.value } : null)}
                                    className="min-h-[100px]"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpenDrawerQuestionId(null)}>
                                  취소
                                </Button>
                                <Button onClick={handleQuestionSave}>
                                  저장
                                </Button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-4">
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
                            {question.options.map((option, optIndex) => (
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
                ))
              )}
            </div>
          )}

          {currentView === "question-table" && (
            <div className="space-y-6">
              {/* 전체 선택 체크박스 & 선택 삭제/내보내기 버튼 */}
              <div className="flex items-center gap-4 mb-2">
                <Checkbox
                  checked={isAllSelected}
                  ref={el => { if (el) (el as HTMLInputElement).indeterminate = isPartiallySelected }}
                  onCheckedChange={checked => {
                    if (typeof checked !== 'boolean') return;
                    handleSelectAll(checked);
                  }}
                  disabled={filteredQuestions.length === 0}
                />
                <span className="text-sm">전체 선택</span>
                <div className="flex-1" />
                {selectedQuestionIds.size > 0 && (
                  <>
                    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          내보내기
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
                          <Button onClick={handleExportSelectedQuestions} disabled={selectedQuestionIds.size === 0}>
                            확인
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                      선택 삭제 ({selectedQuestionIds.size})
                    </Button>
                  </>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 border-b"><Checkbox checked={isAllSelected} ref={el => { if (el) (el as HTMLInputElement).indeterminate = isPartiallySelected }} onCheckedChange={checked => { if (typeof checked !== 'boolean') return; handleSelectAll(checked); }} /></th>
                      <th className="px-2 py-2 border-b">문제</th>
                      <th className="px-2 py-2 border-b">유형</th>
                      <th className="px-2 py-2 border-b">학년</th>
                      <th className="px-2 py-2 border-b">난이도</th>
                      <th className="px-2 py-2 border-b">발문</th>
                      <th className="px-2 py-2 border-b">정답</th>
                      <th className="px-2 py-2 border-b">세트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question, index) => (
                      <tr key={question.id} className="border-b">
                        <td className="px-2 py-2 text-center">
                          <Checkbox checked={selectedQuestionIds.has(question.id)} onCheckedChange={checked => { if (typeof checked !== 'boolean') return; handleQuestionSelect(question.id, checked); }} />
                        </td>
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">{question.type}</td>
                        <td className="px-2 py-2">{getGradeLabel(question.grade)}</td>
                        <td className="px-2 py-2">{question.difficulty}</td>
                        <td className="px-2 py-2 max-w-xs truncate relative group" title={question.questionStatement}>
                          <span>{question.questionStatement}</span>
                          <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white font-bold uppercase rounded-md px-4 h-6 text-[13px] leading-6 ml-2 shadow hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-1"
                            style={{ minWidth: 56, letterSpacing: '1px' }}
                            onClick={() => {
                              setOpenDrawerQuestionId(question.id);
                              setEditingQuestionId(question.id);
                              setEditedQuestion({ ...question });
                            }}
                          >
                            <PanelRightOpen className="w-4 h-4" />
                            OPEN
                          </button>
                        </td>
                        <td className="px-2 py-2">{typeof question.correctAnswer === 'number' && question.options ? question.options[question.correctAnswer] : ''}</td>
                        <td className="px-2 py-2">{question.parentSetTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 문항 상세 Drawer */}
              {openDrawerQuestionId && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '100vh',
                    width: '100vw',
                    zIndex: 100,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      height: '100vh',
                      width: isDrawerMax ? maxDrawerWidth : drawerWidth,
                      maxWidth: maxDrawerWidth,
                      minWidth: 320,
                      background: 'white',
                      pointerEvents: 'auto',
                      boxShadow: 'rgba(0,0,0,0.08) -4px 0 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 200,
                    }}
                  >
                    {/* 좌상단 아이콘 바 */}
                    <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 10001, display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', padding: 8 }}>
                      <button
                        onClick={() => setOpenDrawerQuestionId(null)}
                        className="rounded hover:bg-gray-200 p-1 text-gray-600 flex items-center"
                        aria-label="드로우어 닫기"
                      >
                        <ChevronRight className="w-4 h-4 -mr-1" />
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (isDrawerMax) {
                            setDrawerWidth(defaultDrawerWidth)
                            setIsDrawerMax(false)
                          } else {
                            setDrawerWidth(maxDrawerWidth)
                            setIsDrawerMax(true)
                          }
                        }}
                        className="rounded hover:bg-gray-200 p-1 text-gray-600"
                        aria-label="드로우어 최대/기본 크기 토글"
                      >
                        <Expand className="w-5 h-5" />
                      </button>
                    </div>
                    {/* 리사이즈 핸들 */}
                    <div
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 9999, pointerEvents: 'auto' }}
                      onMouseDown={handleResizeMouseDown}
                    />
                    <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingTop: '56px' }}>
                      {(() => {
                        const q = filteredQuestions.find(q => q.id === openDrawerQuestionId)
                        if (!q) return null
                        return (
                          <div className="max-w-lg mx-auto p-6">
                            <div className="mb-6">
                              <h2 className="text-xl font-bold mb-4">문항 수정</h2>
                              <div className="mb-4">
                                <Label htmlFor="type">유형</Label>
                                <Select
                                  value={editedQuestion?.type || ''}
                                  onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, type: value } : null)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="유형 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="객관식">객관식</SelectItem>
                                    <SelectItem value="주관식">주관식</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="grade">학년</Label>
                                <Select
                                  value={editedQuestion?.grade || ''}
                                  onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, grade: value } : null)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="학년 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="초1">초등 1학년</SelectItem>
                                    <SelectItem value="초2">초등 2학년</SelectItem>
                                    <SelectItem value="초3">초등 3학년</SelectItem>
                                    <SelectItem value="초4">초등 4학년</SelectItem>
                                    <SelectItem value="초5">초등 5학년</SelectItem>
                                    <SelectItem value="초6">초등 6학년</SelectItem>
                                    <SelectItem value="중1">중등 1학년</SelectItem>
                                    <SelectItem value="중2">중등 2학년</SelectItem>
                                    <SelectItem value="중3">중등 3학년</SelectItem>
                                    <SelectItem value="고1">고등 1학년</SelectItem>
                                    <SelectItem value="고2">고등 2학년</SelectItem>
                                    <SelectItem value="고3">고등 3학년</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="difficulty">난이도</Label>
                                <Select
                                  value={editedQuestion?.difficulty || ''}
                                  onValueChange={(value: "상" | "중" | "하") => setEditedQuestion(prev => prev ? { ...prev, difficulty: value } : null)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="난이도 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="상">상</SelectItem>
                                    <SelectItem value="중">중</SelectItem>
                                    <SelectItem value="하">하</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="questionStatement">발문</Label>
                                <Textarea
                                  id="questionStatement"
                                  value={editedQuestion?.questionStatement || ''}
                                  onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, questionStatement: e.target.value } : null)}
                                  className="min-h-[100px]"
                                />
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="passage">지문</Label>
                                <Textarea
                                  id="passage"
                                  value={editedQuestion?.passage || ''}
                                  onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, passage: e.target.value } : null)}
                                  className="min-h-[200px]"
                                />
                              </div>
                              <div className="mb-4">
                                <Label>선택지</Label>
                                <div className="space-y-2">
                                  {editedQuestion?.options.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                      <Input
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...(editedQuestion?.options || [])]
                                          newOptions[index] = e.target.value
                                          setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                        }}
                                      />
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          const newOptions = [...(editedQuestion?.options || []).filter((_, i) => i !== index)]
                                          setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      const newOptions = [...(editedQuestion?.options || []), '']
                                      setEditedQuestion(prev => prev ? { ...prev, options: newOptions } : null)
                                    }}
                                  >
                                    선택지 추가
                                  </Button>
                                </div>
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="correctAnswer">정답</Label>
                                <Select
                                  value={String(editedQuestion?.correctAnswer)}
                                  onValueChange={(value: string) => setEditedQuestion(prev => prev ? { ...prev, correctAnswer: Number(value) } : null)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="정답 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {editedQuestion?.options.map((_, index) => (
                                      <SelectItem key={index} value={String(index)}>
                                        {index + 1}번
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="explanation">해설</Label>
                                <Textarea
                                  id="explanation"
                                  value={editedQuestion?.explanation || ''}
                                  onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                                  className="min-h-[100px]"
                                />
                              </div>
                              <div className="mb-4">
                                <Label htmlFor="memo">메모</Label>
                                <Textarea
                                  id="memo"
                                  value={editedQuestion?.memo || ''}
                                  onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, memo: e.target.value } : null)}
                                  className="min-h-[100px]"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setOpenDrawerQuestionId(null)}>
                                취소
                              </Button>
                              <Button onClick={handleQuestionSave}>
                                저장
                              </Button>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 세트 상세 보기 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {isEditMode ? (
                <div className="flex-1 mr-4">
                  <Input
                    value={editedSet?.title || ''}
                    onChange={(e) => setEditedSet(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="세트 제목을 입력하세요"
                    className="text-lg font-semibold"
                  />
                </div>
              ) : (
                <span className="text-lg font-semibold">{selectedSet?.title}</span>
              )}
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      취소
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      저장
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isEditMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
                  {isEditMode && editedSet && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editedSet.tags.map((tag, index) => (
                          <Badge key={index} className="flex items-center gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 text-xs opacity-70 hover:opacity-100 focus:outline-none"
                            >
                              x
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        type="text"
                        placeholder="태그를 입력하고 공백 또는 Enter를 눌러 추가하세요."
                        value={tagInputValue}
                        onChange={handleTagChange}
                        onBlur={handleAddTagOnBlur}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedSet && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Badge variant="secondary">{selectedSet.questions[0]?.type}</Badge>
                  <Badge variant="outline">{getGradeLabel(selectedSet.questions[0]?.grade)}</Badge>
                  <Badge variant="outline">난이도: {selectedSet.questions[0]?.difficulty}</Badge>
                </div>
                {selectedSet.tags && selectedSet.tags.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                            {selectedSet.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                {selectedSet.questions.map((question, index) => (
                  <Card key={question.id} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900 bg-blue-50 p-3 rounded-lg">
                          {question.questionStatement}
                        </h3>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">지문</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.passage}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">선택지</h3>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
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
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                      {question.memo && (
                        <Card className="p-4 bg-yellow-50 border-yellow-200">
                          <h3 className="text-sm font-semibold text-yellow-700 mb-2">메모</h3>
                          <p className="text-yellow-800 whitespace-pre-wrap break-words">{question.memo}</p>
                        </Card>
                      )}
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 선택 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택한 문항을 삭제할까요?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-gray-600">삭제하면 복구할 수 없습니다.</div>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedQuestions}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
