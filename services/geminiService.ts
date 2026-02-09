/// <reference types="vite/client" />
import { ProductData } from "../types";


// ✅ 중요: 코드가 Vercel 설정을 바라보게 변경했습니다.
// 여기에 키를 직접 적지 마세요!
const OPENROUTER_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateCopywriting = async (
  data: ProductData
): Promise<Partial<ProductData>> => {

  if (!OPENROUTER_API_KEY) {
    alert("API 키가 없습니다! Vercel 환경변수 설정을 확인해주세요.");
    throw new Error("API Key Missing");
  }

  const activeSlots: string[] = ["[FEATURE]", "[POINT1_1]"];
  
  let imageGuide = `
[이미지 매핑 정보]
1. Main Image: 전체 컨셉
2. Point 1-1 Image: 첫 번째 특징
`;

  let structureGuide = `[FEATURE]\n(메인 특징 요약)\n[POINT1_1]\n(포인트1-1 설명)\n`;
  let imgCount = 2; 

  // Point 1-2
  if (data.point1Image2 || data.aiPoint1Desc2) { 
    activeSlots.push("[POINT1_2]"); 
    structureGuide += `[POINT1_2]\n(포인트1-2 이미지 묘사)\n`;
    if(data.point1Image2) imageGuide += `${++imgCount}. Point 1-2 Image: 구체적 특징\n`;
  }
  
  // Point 1-3
  if (data.point1Image3 || data.aiPoint1Desc3) { 
    activeSlots.push("[POINT1_3]"); 
    structureGuide += `[POINT1_3]\n(포인트1-3 이미지 묘사)\n`;
    if(data.point1Image3) imageGuide += `${++imgCount}. Point 1-3 Image: 구체적 특징\n`;
  }

  // Point 2-1
  if (data.point2Image1 || data.aiPoint2Desc) { 
    activeSlots.push("[POINT2_1]"); 
    structureGuide += `[POINT2_1]\n(포인트2-1 설명)\n`; 
    if(data.point2Image1) imageGuide += `${++imgCount}. Point 2-1 Image: 두 번째 특징\n`;
  }

  // Point 2-2
  if ((data as any).point2Image2 || (data as any).aiPoint2Desc2) { 
    activeSlots.push("[POINT2_2]"); 
    structureGuide += `[POINT2_2]\n(포인트2-2 설명)\n`; 
    if((data as any).point2Image2) imageGuide += `${++imgCount}. Point 2-2 Image: 추가 특징\n`;
  }

  // Point 2-3
  if ((data as any).point2Image3 || (data as any).aiPoint2Desc3) { 
    activeSlots.push("[POINT2_3]"); 
    structureGuide += `[POINT2_3]\n(포인트2-3 설명)\n`; 
    if((data as any).point2Image3) imageGuide += `${++imgCount}. Point 2-3 Image: 마무리 특징\n`;
  }

  const systemPrompt = `
 당신은 '바나나몰'의 수석 카피라이터입니다.
 제공된 이미지들과 스펙 정보를 분석하여 판매 실적을 높일 수 있는 매혹적이고 설득력 있는 상세페이지 문구를 작성하세요.

 ⚠️ [핵심 작성 목표]
 1. **분량 엄수**: 각 섹션(태그)마다 **반드시 4~5줄 분량**으로 작성하세요. (너무 짧으면 안 됩니다).
 2. **구매 욕구 자극**: 단순한 설명이 아니라, 고객이 이 글을 읽고 "당장 사고 싶다"는 마음이 들도록 감성적이고 자극적인 표현을 사용하세요.
 3. **스펙 활용**: 제공된 요약정보(스펙)를 문구에 자연스럽게 녹여내어 신뢰도를 더하세요. (예: "70g의 가벼움으로..." 등)

 ⚠️ [필수 작업 프로세스 (엄수)]
 1. **1단계 (이미지 정밀 분석)**: 
    - 텍스트나 스펙을 먼저 생각하지 말고, **제공된 이미지를 있는 그대로 정밀하게 관찰**하세요.
    - 이미지가 '리모컨'인지, '케이블'인지, '제품의 특정 돌기'인지 시각적 특징을 먼저 확정하세요.
 2. **2단계 (스펙 매칭 및 문구 작성)**:
    - 1단계에서 파악한 이미지 내용과 '스펙 정보(요약정보)'를 연결하여 문구를 작성하세요.
    - (예: 이미지에서 '선'이 보이면 -> 스펙의 '충전 방식'을 확인 -> "자석식 충전 케이블"이라고 정확히 명시)
 
 ⭐ **[소품/구성품 해석 가이드]**:
 - **리모컨** 발견 시 -> 스펙의 '리모컨' 여부와 연결하여 "멀리서도 자유로운 무선 조작" 강조.
 - **USB 케이블** 발견 시 -> 스펙의 '전원/충전' 정보와 연결하여 "어디서나 간편한 USB 충전" 강조.
 - **설명서/구성품** 발견 시 -> "알찬 구성품과 가이드"로 해석.

 ⚠️ [작성 가이드]
 1. 톤앤매너: 성인 문학 스타일 (고급스러우면서도 관능적, 번역투 금지).
 2. 출력 형식: 아래 태그 구조를 엄수할 것.

 [출력 구조]
 ${structureGuide}
 `;

  const userTextPrompt = `
 상품명: ${data.productNameKr}
 
 [핵심 스펙 및 요약 정보]
 ${Array.isArray(data.summaryInfo) ? data.summaryInfo.join("\n") : JSON.stringify(data.summaryInfo)}

 위 정보를 바탕으로, 각 이미지를 분석하여 4~5줄 분량의 찰떡같은 상세페이지 문구를 써주세요.
 `;

  let messages: any[] = [{ role: "system", content: systemPrompt }];
  const contentParts: any[] = [{ type: "text", text: userTextPrompt }];

  const addImageToPrompt = (img: string | undefined | null) => {
    if (img && img.startsWith("data:image")) {
      contentParts.push({ type: "image_url", image_url: { url: img } });
    }
  };

  addImageToPrompt(data.mainImage);      
  addImageToPrompt(data.point1Image1);   
  if(activeSlots.includes("[POINT1_2]")) addImageToPrompt(data.point1Image2); 
  if(activeSlots.includes("[POINT1_3]")) addImageToPrompt(data.point1Image3); 
  if(activeSlots.includes("[POINT2_1]")) addImageToPrompt(data.point2Image1); 
  if(activeSlots.includes("[POINT2_2]")) addImageToPrompt((data as any).point2Image2);
  if(activeSlots.includes("[POINT2_3]")) addImageToPrompt((data as any).point2Image3);

  messages.push({ role: "user", content: contentParts });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bananamall.co.kr",
        "X-Title": "BananaMall Builder",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: messages,
        temperature: 0.6,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenRouter API Error Details:", errorText);
      throw new Error(`API 호출 실패: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content || "";
    
    const extract = (tag: string) => {
      const regex = new RegExp(`\\${tag}([\\s\\S]*?)(\\[|$)`, 'i');
      const match = text.match(regex);
      return match ? formatDescription(match[1]) : "";
    };

    const result: Partial<ProductData> = {};
    result.aiFeatureDesc = extract("[FEATURE]");
    result.aiPoint1Desc = extract("[POINT1_1]");
    
    if (activeSlots.includes("[POINT1_2]")) result.aiPoint1Desc2 = extract("[POINT1_2]");
    if (activeSlots.includes("[POINT1_3]")) result.aiPoint1Desc3 = extract("[POINT1_3]");
    if (activeSlots.includes("[POINT2_1]")) result.aiPoint2Desc = extract("[POINT2_1]");
    if (activeSlots.includes("[POINT2_2]")) result.aiPoint2Desc2 = extract("[POINT2_2]");
    if (activeSlots.includes("[POINT2_3]")) result.aiPoint2Desc3 = extract("[POINT2_3]");

    return result as any;

  } catch (error: any) {
    console.error(error);
    alert(`[생성 실패] ${error.message}`);
    return {};
  }
};

const formatDescription = (text: string) => {
  if (!text) return "";
  let result = text.trim().replace(/^[:：)\-]/, "").trim(); 
  result = result.replace(/\. /g, ".\n");
  const breakers = ["또한", "그리고", "특히", "가장", "동시에"];
  breakers.forEach(word => {
    const regex = new RegExp(`\\s?${word}`, "g");
    result = result.replace(regex, `\n${word}`);
  });
  return result;
};