const axios = require('axios');

const testCases = [
  {
    title: "물품 구입 요청",
    input: {
      relatedDocs: [
        { dept: "행복초", docNumber: "123", docDate: "2024. 5. 3", docTitle: "" }
      ],
      content: "방송 물품 구입 건의.",
      attachments: []
    },
    expectedMustNotContain: ["감사합니다", "검토", "귀 기관", "추가적인"]
  },
  {
    title: "연수 안내",
    input: {
      relatedDocs: [],
      content: "2025학년도 직무연수 신청 안내\n기간은 5월 1일부터 3일까지입니다.",
      attachments: [{ attachment: "연수 운영 계획", count: "1" }]
    },
    expectedMustContain: ["다음과 같이 안내합니다"]
  }
];

async function runTests() {
  for (const test of testCases) {
    console.log(`\n=== [${test.title}] ===`);
    try {
      const res = await axios.post("http://localhost:8888/.netlify/functions/generateDoc", test.input);
      const output = res.data.generatedDoc;
      console.log(output);

      // 간단한 자동 검토
      test.expectedMustNotContain?.forEach(str => {
        if (output.includes(str)) {
          console.warn(`⚠️ 포함되면 안 되는 문장 포함됨: "${str}"`);
        }
      });

      test.expectedMustContain?.forEach(str => {
        if (!output.includes(str)) {
          console.warn(`⚠️ 반드시 포함되어야 할 문장이 없음: "${str}"`);
        }
      });
    } catch (err) {
      console.error("❌ 오류 발생:", err.message);
    }
  }
}

runTests();
