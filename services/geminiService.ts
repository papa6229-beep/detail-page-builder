/// <reference types="vite/client" />  <-- 1. 이 줄 추가
import { ProductData } from "../types"; // <-- 2. 원래 있던 코드


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
제공된 이미지들을 순서대로 분석하여 각 섹션에 맞는 상세페이지 문구를 작성하세요.

⚠️ [이미지 분석 필승 공략]
제공된 이미지 순서는 다음과 같습니다:
${imageGuide}

각 태그([POINT...])를 작성할 때, 위 순서에 해당하는 이미지를 **반드시** 참고하여 묘사하세요.
예를 들어 Point 1-2 이미지가 '손으로 늘리는 사진'이라면, [POINT1_2] 내용에 "놀라운 신축성"을 언급해야 합니다.
물 이미지가 보이면 "위생/세척"으로 해석하세요.

⚠️ [작성 가이드]
1. 톤앤매너: 성인 문학 스타일 (고급, 관능, 번역투 금지).
2. 출력 형식: 아래 태그 구조를 엄수할 것.

[출력 구조]
${structureGuide}
`;

  const userTextPrompt = `
상품명: ${data.productNameKr}
요약정보:
${Array.isArray(data.summaryInfo) ? data.summaryInfo.join("\n") : JSON.stringify(data.summaryInfo)}

위 정보를 바탕으로, 각 이미지를 분석하여 찰떡같은 문구를 써주세요.
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

    if (!res.ok) throw new Error("API 호출 실패");
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