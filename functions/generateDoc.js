const { OpenAI } = require('openai');

exports.handler = async (event) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { related, content, admin, attachment } = JSON.parse(event.body || '{}');

  if (!related || !content || !attachment) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '필수 항목(관련, 본문, 붙임)이 누락되었습니다.' }),
    };
  }

  const prompt = `
    한국 초등학교 공문 형식으로 작성하세요:
    1. 관련: ${related} (부서명-문서번호(날짜, "제목") 형식으로 이전 공문 참조)
    2. 본문: ${content} ("다음과 같이 안내하오니, 필요시 협조 부탁드립니다"로 시작, "가.", "나."로 항목화, 필요시 1), 2) 하위 항목 포함)
    3. 행정사항: ${admin || '없음'} (선택적, "본 공문으로 위촉장을 대신합니다" 포함 가능, 문의 연락처 추가 가능)
    붙임: ${attachment} ("붙임"으로 시작, "1부. 끝." 형식으로 첨부 자료 나열)
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const generatedDoc = response.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ generatedDoc }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '공문서 생성 중 오류: ' + error.message }),
    };
  }
};