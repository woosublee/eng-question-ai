import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface QuestionGenerationParams {
  type: string;
  difficulty: string;
  grade: string;
  count: number;
}

export async function generateQuestion({ type, difficulty, grade, count = 1 }: QuestionGenerationParams) {
  const prompt = `
다음 조건에 맞는 영어 독해 문제 ${count}개를 생성해주세요:

문제 유형: ${type}
난이도: ${difficulty}
학년: ${grade}

다음 형식으로 JSON 응답을 해주세요:
{
  "questions": [
    {
      "passage": "영어 지문",
      "questionStatement": "한국어 발문",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
      "correctAnswer": 정답_인덱스(0-4),
      "explanation": "한국어 해설"
    },
    // ... ${count}개의 문제
  ]
}

주의사항:
1. 각 문제의 지문은 서로 다른 주제로 작성해주세요.
2. 난이도에 맞는 어휘와 문법을 사용해주세요.
3. 학년 수준에 맞는 내용과 표현을 사용해주세요.
4. 각 문제는 독립적이고 완성된 형태여야 합니다.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert English teacher who creates high-quality reading comprehension questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");
    return response.questions || [];
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
} 