exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "함수 테스트 성공" }),
  };
};