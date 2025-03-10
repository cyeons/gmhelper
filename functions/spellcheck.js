const { OpenAI } = require('openai');

exports.handler = async (event) => {
  console.log('받은 이벤트:', event); // 이벤트 확인
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('API 키 존재 여부:', !!process.env.OPENAI_API_KEY); // 키 있는지 확인

  const { text } = JSON.parse(event.body || '{}');
  if (!text) {
    console.log('텍스트 없음');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '텍스트가 제공되지 않았습니다' }),
    };
  }

  const prompt = `공문서 작성 규칙을 지키며 다음 텍스트의 오탈자와 문법 오류를 수정하세요:\n${text}`;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    console.log('API 응답:', response); // 응답 확인
    const correctedText = response.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ correctedText }),
    };
  } catch (error) {
    console.log('오류 발생:', error.message); // 오류 메시지 출력
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '오탈자 검사 중 오류 발생: ' + error.message }),
    };
  }
};