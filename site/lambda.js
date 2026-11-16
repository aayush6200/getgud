// AWS Lambda entry point. The same Express app, wrapped for a Lambda Function URL.
const serverless = require("serverless-http");
module.exports.handler = serverless(require("./server.js"));
