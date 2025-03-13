const { OpenAI } = require('openai');

exports.handler = async (event) => {
  console.log('받은 이벤트:', event);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    console.log('event.body 파싱 오류:', e.message);
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 데이터' }) };
  }

  const { dept, docNumber, docTitle, docDate, content, admin, attachment } = body;
  console.log('입력값:', { dept, docNumber, docTitle, docDate, content, admin, attachment });

  if (!content || !attachment) {
    console.log('필수 항목 누락');
    return { statusCode: 400, body: JSON.stringify({ error: '필수 항목(본문, 붙임)이 누락되었습니다.' }) };
  }

  // 관련 문서 유무 체크
  const hasRelated = dept || docNumber || docTitle || docDate;
  let prompt = '한국 초등학교 공문 형식으로 작성하세요:\n';
  
  if (hasRelated) {
    prompt += `1. 관련: ${dept || '부서명'}-${docNumber || '문서번호'}(${docDate || '시행날짜'}, "${docTitle || '문서제목'}")\n`;
  }
  
  prompt += `${hasRelated ? '2' : '1'}. 본문: ${content} ("다음과 같이 안내하오니, 필요시 협조 부탁드립니다"로 시작, "가.", "나."로 항목화, 필요시 1), 2) 하위 항목 포함)\n`;
  
  if (admin) {
    prompt += `${hasRelated ? '3' : '2'}. 행정사항: ${admin} ("본 공문으로 위촉장을 대신합니다" 포함 가능, 문의 연락처 추가 가능)\n`;
  }
  
  prompt += `붙임: ${attachment} ("붙임"으로 시작, "1부. 끝." 형식으로 첨부 자료 나열)`;

  console.log('프롬프트:', prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    console.log('OpenAI 응답:', response);
    const generatedDoc = response.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ generatedDoc }) };
  } catch (error) {
    console.log('OpenAI 오류:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: '공문서 생성 중 오류: ' + error.message }) };
  }
};