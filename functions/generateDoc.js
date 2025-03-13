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

  const { deptDocNumber, docTitle, docDate, content, admin, attachment } = body;
  console.log('입력값:', { deptDocNumber, docTitle, docDate, content, admin, attachment });

  if (!content) {
    console.log('필수 항목 누락');
    return { statusCode: 400, body: JSON.stringify({ error: '필수 항목(본문)이 누락되었습니다.' }) };
  }

  // 관련 문서 유무 체크
  const hasRelated = deptDocNumber && docTitle && docDate; // 모두 있어야 관련 문서로 간주
  const hasAdmin = admin;
  const hasAttachment = attachment;

  let prompt = `
    다음 조건을 엄격히 지켜 한국 초등학교 공문 형식으로 작성하세요:
    - 번호는 "1.", "2.", "3." 형식으로 붙이며, 입력값에 따라 섹션 생략 가능.
    - "관련"은 입력값이 모두 있을 때만 추가, 형식은 "부서명-문서번호(시행날짜, \\"문서제목\\")".
    - "본문"은 항상 포함, 첫 줄은 "입력값을 다음과 같이 안내하오니,"로 시작하고 협조 요청은 상황에 따라 "귀 기관의 해당자가 ... 적극 참여할 수 있도록 협조하여 주시기 바랍니다" 또는 "강사에 선정된 교사가 참석할 수 있도록 협조 부탁드립니다"로 조정.
    - "행정사항"은 입력값 있을 때만 추가, "가.", "나."로 항목화.
    - "붙임"은 입력값 있을 때만 추가, "붙임"으로 시작하고 "1부. 끝."으로 마무리.
    - 각 섹션 사이에 빈 줄 한 줄씩 추가.
  `;

  if (hasRelated) {
    prompt += `
      1. 관련: ${deptDocNumber}(${docDate}, "${docTitle}")
    `;
  }

  prompt += `
    ${hasRelated ? '2' : '1'}. ${content}을 다음과 같이 안내하오니, ${hasAdmin ? '귀 기관의 해당자가 적극 참여할 수 있도록 협조하여 주시기 바랍니다' : '강사에 선정된 교사가 참석할 수 있도록 협조 부탁드립니다'}.
  `;
  prompt += content.split('\n').map(line => `  ${line}`).join('\n');

  if (hasAdmin) {
    prompt += `
      ${hasRelated ? '3' : '2'}. 행정사항
    `;
    prompt += admin.split('\n').map(line => `  ${line}`).join('\n');
  }

  if (hasAttachment) {
    prompt += `
      붙임  ${attachment} 1부. 끝.
    `;
  }

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