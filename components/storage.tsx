"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Trash2, Eye, Download, Calendar, BookOpen, Tag, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SavedQuestionSet } from "@/app/page"
import { Textarea } from "@/components/ui/textarea"

interface StorageProps {
  questionSets: SavedQuestionSet[]
  onDelete: (setId: string) => void
  onUpdate: (setId: string, updatedSet: SavedQuestionSet) => void
}

export function Storage({ questionSets, onDelete, onUpdate }: StorageProps) {
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

  const handleExportSet = (set: SavedQuestionSet) => {
    const exportData = {
      metadata: {
        title: set.title,
        difficulty: set.questions[0]?.difficulty,
        grade: set.questions[0]?.grade,
        savedAt: set.savedAt,
        totalQuestions: set.questions.length,
        tags: set.tags,
      },
      questions: set.questions,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${set.title}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* 상단 헤더 영역 - 고정 */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">보관함</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpen className="w-4 h-4" />총 {questionSets.length}개 세트 •{" "}
            {questionSets.reduce((sum, set) => sum + set.questions.length, 0)}개 문항
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
          {filteredSets.length === 0 ? (
            <div className="text-center py-12">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSets.map((set) => (
                <Card key={set.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{set.title}</h3>
                      <div className="flex items-center gap-2 mb-3">
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
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(set)} className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      보기
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportSet(set)}>
                      <Download className="w-4 h-4" />
                    </Button>
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
              ))}
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
                      {question.memo && (
                        <Card className="p-4 bg-yellow-50 border-yellow-200">
                          <h3 className="text-sm font-semibold text-yellow-700 mb-2">메모</h3>
                          <p className="text-yellow-800 whitespace-pre-wrap">{question.memo}</p>
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
    </div>
  )
}
