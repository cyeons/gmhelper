const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event, context) {
  try {
    const data = JSON.parse(event.body);
    const relatedDocs = data.relatedDocs || [];
    const content = data.content || "";
    const attachments = data.attachments || [];
    const firstLine = content.split("\n")[0] || "";

    const relatedText =
      relatedDocs.length > 0
        ? `1. 관련: ${relatedDocs
            .map(
              (doc) =>
                `${doc.dept}-${doc.docNumber}(${doc.docDate}) "${doc.docTitle}"`
            )
            .join(", ")}\n\n`
        : "";

    const attachmentText =
      attachments.length > 0
        ? `붙임  ${attachments
            .map((item) => `${item.attachment} ${item.count}부`)
            .join(", ")}.  끝.`
        : "끝.";

    const prompt = `
당신은 대한민국 초등학교의 공문서를 작성하는 AI 비서입니다.

아래에 입력된 정보를 바탕으로 [2025 개정 공문서 작성법] 및 [행정업무운영편람]의 규정에 따라 엄격하게 공문서를 작성하십시오.

✅ 반드시 지켜야 할 작성 규칙:
- 입력된 내용 외에는 어떠한 정보도 추가하지 마십시오.
- 문장은 반드시 "~합니다", "~입니다" 형태의 사실형 종결어미만 사용하십시오.
- 하위 항목은 '가.', '나.', '다.' 순으로 정리하며, 항목 간 줄을 띄우고 들여쓰지 않습니다.
- '기간', '장소', '대상', '방법', '내용', '비용' 등의 단어가 있을 경우에만 항목으로 분리합니다.
- 붙임 문서는 "붙임", 문서명, 부수 형식으로 작성하고, 마지막 줄은 반드시 "끝."으로 마무리합니다.
- 숫자, 날짜, 시간은 행정서식 기준(예: 2025. 3. 10.)을 따릅니다.
- 아래 예시 형식을 그대로 따르십시오.

📄 예시:
1. 관련: 교무기획부-2024(2025. 3. 1.) "2025학년도 학사 운영 계획"

2. 2025학년도 학사 운영 계획을 다음과 같이 안내합니다.

  가. 기간: 2025. 3. 4.(월) ~ 3. 8.(금)

  나. 장소: 각 학년 교실

  다. 대상: 전교생

붙임  2025학년도 학사 운영 계획안 1부.  끝.

📬 입력값:

${relatedText}2. ${firstLine}을 다음과 같이 안내합니다.

${content}

${attachmentText}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error("Error generating document:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};