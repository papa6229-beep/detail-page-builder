
import { GoogleGenAI, Type } from "@google/genai";
import { ProductData } from "../types";

export const generateCopywriting = async (data: ProductData): Promise<{
  aiSummary: string;
  aiFeatureDesc: string;
  aiPoint1Desc: string;
  aiPoint2Desc: string;
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    국내 이커머스 상세페이지 전문 기획자로서 다음 상품 정보를 바탕으로 매력적인 상세페이지 카피를 작성해줘.
    
    상품명(국문): ${data.productNameKr}
    상품명(영문): ${data.productNameEn}
    요약정보: ${JSON.stringify(data.summaryInfo)}
    
    지침:
    1. 자연스러운 한국어 사용
    2. 과장 및 선정적 표현 금지 (중요!)
    3. 성인용품 카테고리 특성상 직접적 표현 최소화
    4. 실사용, 촉감, 구조 중심 설명
    5. aiSummary는 3줄 요약이어야 함 (불렛포인트 없이 3문장)
    6. 나머지 설명글은 각 2~3문장 정도의 매끄러운 단락으로 작성
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiSummary: { type: Type.STRING, description: "3-line summary of key features" },
          aiFeatureDesc: { type: Type.STRING, description: "Main feature description text" },
          aiPoint1Desc: { type: Type.STRING, description: "Point 1 description text" },
          aiPoint2Desc: { type: Type.STRING, description: "Point 2 description text" },
        },
        required: ["aiSummary", "aiFeatureDesc", "aiPoint1Desc", "aiPoint2Desc"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      aiSummary: "상품의 뛰어난 품질과 디자인을 경험해보세요. 최상의 만족감을 위해 세심하게 설계되었습니다. 누구나 만족할 수 있는 실용적인 선택입니다.",
      aiFeatureDesc: "혁신적인 기술력이 집약된 메인 기능을 소개합니다. 사용자 편의성을 극대화한 구조로 설계되어 일상에 즐거움을 더해줍니다.",
      aiPoint1Desc: "부드러운 재질과 인체공학적 디자인이 조화를 이룹니다. 장시간 사용해도 변함없는 편안함을 제공하며 디테일한 마감 처리가 돋보입니다.",
      aiPoint2Desc: "내구성이 뛰어난 소재를 사용하여 안심하고 사용할 수 있습니다. 세척과 관리가 용이하며 세련된 외형으로 인테리어 효과까지 얻을 수 있습니다.",
    };
  }
};
