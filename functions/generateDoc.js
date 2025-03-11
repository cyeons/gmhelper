const { OpenAI } = require('openai');

exports.handler = async (event) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { sender, receiver, title, content, contact } = JSON.parse(event.body || '{}');

  if (!sender || !receiver || !title || !content) {
    return { statusCode: 400, body: JSON.stringify({ error: '필수 정보 누락' }) };
  }

  const prompt = `당신은 한국 관공서 공문서 작성 전문가입니다. 다음 정보를 바탕으로 공문서를 작성하세요:
  - 발신: ${sender}
  - 수신: ${receiver}
  - 제목: ${title}
  - 내용: ${content}
  - 담당자: ${contact}
  형식: 문서번호(임의 생성), 작성일자(2025년 3월 11일), 도입부, 본문(항목화), 결론부, 첨부(없으면 생략), 결재란 포함.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const generatedDoc = response.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ generatedDoc }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};