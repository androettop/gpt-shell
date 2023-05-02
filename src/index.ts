#!/usr/bin/env node

var markdown = require("markdown-it")();
var terminal = require("markdown-it-terminal");
const chalk = require("chalk");
const { Configuration, OpenAIApi } = require("openai");
import { CHAT, INLINE_COMMANDS } from "./prompts";

markdown.use(terminal);

const RISK_COLORS: Record<string, (text: string) => string> = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const getAnswer = async (message: string, isChat: boolean) => {
  const selectedPrompt = isChat ? CHAT : INLINE_COMMANDS;
  if (message.length < 1) {
    console.log("Usage: g <message> [--chat|-c]");
    return;
  }
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: selectedPrompt,
      },
      { role: "user", content: message },
    ],
  });

  const result = completion.data.choices?.[0].message?.content;

  if (isChat) {
    console.log(markdown.render(result));
    return;
  }

  const risk = result?.match(/risk: (low|medium|high)/)?.[1];
  const command = result?.match(/command: (.*)/)?.[1];

  if (risk && command) {
    console.log(RISK_COLORS[risk](`Risk: ${risk}`));
    console.log(RISK_COLORS[risk](command));
  } else {
    console.log("Error: ", result.trim());
  }
};

(async () => {
  const args = process.argv.slice(2);
  const chatMode = args.some((arg) => ["--chat", "-c"].includes(arg));
  const message = args
    .join(" ")
    .replace(/(--chat|-c)/g, "")
    .trim();

  const timeout = setTimeout(() => {
    console.log("AI is thinking...");
  }, 3000);

  getAnswer(message, chatMode);

  clearTimeout(timeout);
})();
