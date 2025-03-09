const { OpenAI } = require('openai');

exports.handler = async (event) => {
  // 환경 변수에서 OpenAI API 키 가져오기
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 사용자가 보낸 텍스트 가져오기
  const { text } = JSON.parse(event.body);

  // OpenAI에 보낼 프롬프트 작성
  const prompt = `공문서 작성 규칙을 지키며 다음 텍스트의 오탈자와 문법 오류를 수정하세요:\n${text}`;

  try {
    // OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // 기본 모델, 나중에 다른 모델로 변경 가능
      messages: [{ role: 'user', content: prompt }],
    });

    // 수정된 텍스트 반환
    const correctedText = response.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ correctedText }),
    };
  } catch (error) {
    // 오류 처리
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '오탈자 검사 중 오류 발생' }),
    };
  }
};