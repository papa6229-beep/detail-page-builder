import { ProductData } from "../types";

export const generateCopywriting = async (
  data: ProductData
): Promise<{
  aiSummary: string;
  aiFeatureDesc: string;
  aiPoint1Desc: string;
  aiPoint2Desc: string;
}> => {
  const prompt = `
국내 이커머스 상세페이지 전문 기획자로서 다음 상품 정보를 바탕으로
각 항목에 맞는 문구를 작성해줘.

상품명(국문): ${data.productNameKr}
상품명(영문): ${data.productNameEn}
요약정보: ${JSON.stringify(data.summaryInfo)}

아래 형식으로만 답변해줘:

[SUMMARY]
(3문장 요약)

[FEATURE]
(메인 특징 설명 2~3문장)

[POINT1]
(포인트1 설명 2~3문장)

[POINT2]
(포인트2 설명 2~3문장)
`;

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-vl:8b",
        prompt: prompt,
        stream: false,
      }),
    });

    const raw = await res.text();
    const lines = raw.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    const json = JSON.parse(lastLine);
    const text: string = json.response || "";

    const extract = (label: string) => {
      const regex = new RegExp(`\\[${label}\\]([\\s\\S]*?)(\\n\\[|$)`);
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

const summaryRaw = extract("SUMMARY");

return {
  aiSummary: formatSummary3Lines(summaryRaw),
  aiFeatureDesc: extract("FEATURE"),
  aiPoint1Desc: extract("POINT1"),
  aiPoint2Desc: extract("POINT2"),
};
  } catch (error) {
    console.error("Ollama 호출 실패", error);
    return {
      aiSummary: "상품의 핵심적인 특징을 간결하게 담은 요약 문구입니다.",
      aiFeatureDesc: "제품의 구조와 사용성을 중심으로 설계된 메인 기능 설명입니다.",
      aiPoint1Desc: "실사용을 고려한 첫 번째 포인트 설명 문구입니다.",
      aiPoint2Desc: "관리와 내구성을 강조한 두 번째 포인트 설명 문구입니다.",
    };
  }
};


const formatSummary3Lines = (text: string) => {
  if (!text) return "";

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const fixed = [];

  for (let i = 0; i < 3; i++) {
    if (lines[i]) {
      fixed.push(lines[i].slice(0, 18));
    } else {
      fixed.push("");
    }
  }

  return fixed.join("\n");
};
