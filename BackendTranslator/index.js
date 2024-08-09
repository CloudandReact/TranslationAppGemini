import express from "express";
import mysql from "mysql2";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import * as deepl from "deepl-node";
import pool from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
});
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY2"], // This is the default and can be omitted
});
const authKey = process.env["DEEPL_KEY"]; // Replace with your key
const translator = new deepl.Translator(authKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
function getLanguageCode(languageName) {
  const languageCodes = {
    arabic: "AR",
    dutch: "NL",
    englishinput: "en", // Unspecified English variant
    english: "en-US", // American English
    farsi: null, // Farsi (Persian) code needed
    french: "FR",
    german: "DE",
    greek: "EL",
    hebrew: null, // Hebrew code needed
    hindi: "HI",
    italian: "IT",
    japanese: "JA",
    korean: "KO",
    mandarin: "ZH", // Unspecified Chinese variant
    polish: "PL",
    portuguese: "PT", // Unspecified Portuguese variant
    russian: "RU",
    spanish: "ES",
    swedish: "SV",
    thai: null, // Thai code needed
    turkish: "TR",
    vietnamese: null, // Vietnamese code needed
    yiddish: null, // Yiddish code needed
  };

  return languageCodes[languageName.toLowerCase()] || null;
}

async function evaluateTranslations(translations) {
  // we are going to need to get a point score for each
  const gptModels = ["gpt-3.5-turbo", ]; // ""gpt-4o-2024-08-06""];
  const claudeModels = ["claude-3-5-sonnet-20240620"]; //"claude-3-5-sonnet-20240620,claude-3-sonnet-20240229,claude-3-haiku-20240307"
  let modelEvaluations = [];
  for (const translation of translations) {
    for (const model of gptModels) {
      const evaluationResult = await evaluateModel(model, translation);
      modelEvaluations.push({
        inputModel: translation.model,
        inputText: translation.inputText,
        outputText: translation.translation,
        sourceLanguage: translation.sourceLanguage,
        destinationLanguage: translation.destinationLanguage,
        model: model,
        evaluation: evaluationResult,
      });
    }
    for (const model of claudeModels) {
      const evaluationResult = await evaluateModel(model, translation);
      modelEvaluations.push({
        inputModel: translation.model,
        inputText: translation.inputText,
        outputText: translation.translation,
        sourceLanguage: translation.sourceLanguage,
        destinationLanguage: translation.destinationLanguage,
        model: model,
        evaluation: evaluationResult,
      });
    }
  }
  return modelEvaluations;
}
async function correctGrammarAndSpelling(modelChoice, message, formData) {
  const response = await openai.chat.completions.create({
    model: modelChoice,
    messages: [
      {
        role: "user",
        content: `Please correct basic grammar and spelling errors, and make the following text clearer: ${message}.`,
      },
    ],
    temperature: parseFloat(formData.temperatureValue), // closer to 0 more serious closer to 1 less serious 0.3
    max_tokens: 100, // force it to be more concise
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
  return response.choices[0].message.content.trim();
}
function extractValidJson(result) {
  // Attempt to directly parse the result in case it's already valid JSON
  try {
    const parsedJson = JSON.parse(potentialValidJson);
    return JSON.stringify(parsedJson);
  } catch (error) {
    // If parsing fails, try to find the start of a valid JSON object
    let validStartIndex = result.indexOf("{");
    while (validStartIndex !== -1) {
      try {
        // Attempt to parse from the current '{' to the end of the string
        const potentialValidJson = result.substring(validStartIndex);
        const parsedJson = JSON.parse(potentialValidJson);
        return JSON.stringify(parsedJson);
      } catch (error) {
        // If parsing fails, look for the next '{' in the string
        validStartIndex = result.indexOf("{", validStartIndex + 1);
      }
    }
    // If no valid JSON object was found, return null or throw an error
    return null; // Or throw new Error("Valid JSON not found.");
  }
}

async function evaluateModel(modelChoice, translation) {
  const sourceLanguage = translation.sourceLanguage;
  const destinationLanguage = translation.destinationLanguage;
  let result = {};
  const evaluationPrompt = `Evaluate the accuracy of the provided ${destinationLanguage} translation on a scale from 1 to 10, independently of any errors in the ${sourceLanguage} text. Be generous with partial credit.Infer context and criteria from the English text.
  Provide your response in valid correct JSON,with two attributes score and comment. 
  The comment element of json should be brief , insightful and less than 15 words:
    ${sourceLanguage}: ${translation.inputText}
    ${destinationLanguage}:${translation.translation}`;
  if (modelChoice.includes("gpt")) {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: evaluationPrompt }],
      model: modelChoice,
      temperature: parseFloat(translation.temperatureValue),
      max_tokens: 300,
      frequency_penalty: 0.0,
    });
    result = chatCompletion.choices[0].message.content;
  } else {
    const response = await anthropic.messages.create({
      max_tokens: 300,
      messages: [{ role: "user", content: evaluationPrompt }],
      model: modelChoice,
      temperature: parseFloat(translation.temperatureValue),
    });
    result = response.content[0].text;
  }
  console.log(result);
  return extractValidJson(result);
}
async function improveTranslation(formData, modelChoice) {
  const sourceLanguage = formData.sourceLanguage;
  const destinationLanguage = formData.destinationLanguage;
  var message = formData.message;
  let formatPrompt = "";
  if (formData.shorter) {
    formatPrompt += "Make the translation shorter. \n";
  }
  if (formData.simpler) {
    formatPrompt += "Make the translation simpler. \n";
  }
  if (formData.moreFormal) {
    formatPrompt += "Make the translation more formal. \n";
  }
  if (formData.lessFormal) {
    formatPrompt += "Make the translation less formal. \n";
  }

  const systemPrompt = ` You are a skilled translator tasked with enhancing translations from ${sourceLanguage} to ${destinationLanguage}. Please carefully review the provided translation and make the following improvements. Remember to deliver only the final translated text at the end:
  ${formatPrompt}`;
  const userPrompt = `Source Language: ${sourceLanguage}
Original Text: ${message}

Please review the translation into Destination Language: ${destinationLanguage} and provide the following improvements:

${formatPrompt}

Original Translated Text to be correct: ${formData.translationText}`;
  console.log(systemPrompt);
  console.log(userPrompt);
  const model = genAI.getGenerativeModel({
    model: modelChoice,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: parseFloat(formData.temperatureValue),
    },
  });
  const result = await model.generateContent(userPrompt);
  const response = result.response;
  const text = response.text();
  console.log(text);
  return text;
}
async function translateText(formData, model) {
  const sourceLanguage = formData.sourceLanguage;
  const destinationLanguage = formData.destinationLanguage;
  const correctGrammar = formData.synthesize;
  const modelChoice = model;
  var message = formData.message;
  if (correctGrammar) {
    message = correctGrammarAndSpelling(modelChoice, message, formData);
  }
  var output = "";
  const fixWeirdResponse =
    "Please correct any spelling errors in the text without mentioning them, and then translate the text.";
  const systemPrompt =
    `You are a skilled translator. Correct any typos in the ${sourceLanguage} while translating it into ${destinationLanguage}, ensuring the translation is accurate and natural.` +
    fixWeirdResponse;
  if (modelChoice.includes("gpt")) {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: message },
      ],
      model: modelChoice,
      temperature: parseFloat(formData.temperateValue),
      max_tokens: 200,
      frequency_penalty: 0.0,
    });
    output = chatCompletion.choices[0].message.content;
  } else if (modelChoice.includes("gemini")) {
    const model = genAI.getGenerativeModel({
      model: modelChoice,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: parseFloat(formData.temperatureValue),
      },
    });

    const result = await model.generateContent(message);
    const response = result.response;
    const text = response.text();
    console.log(text);
    output = text;
  } else {
    var sourceLanguageUpdated = sourceLanguage;
    if (sourceLanguage.toLowerCase() === "english") {
      console.log(sourceLanguage.toLowerCase() + "input");
      sourceLanguageUpdated = sourceLanguage.toLowerCase() + "input";
    } else {
      console.log(sourceLanguage.toLowerCase());
    }

    try {
      const result = await translator.translateText(
        message,
        getLanguageCode(sourceLanguageUpdated.toLowerCase()),
        getLanguageCode(destinationLanguage.toLowerCase())
      );
      output = result.text;
    } catch (error) {
      output = `Error: Couldn't translate correctly. ${sourceLanguage} or ${destinationLanguage} arent supported`;
    }
  }

  const query = `
    INSERT INTO PromptData (SystemPrompt, Prompt, Output, context, model, language)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  pool.query(
    query,
    [
      systemPrompt,
      formData.message,
      output,
      JSON.stringify(formData),
      modelChoice,
      destinationLanguage,
    ],
    (err, result) => {
      if (err) throw err;
      console.log("Data inserted successfully.");
    }
  );
  return output;
}

async function saveValidatedTranslations(validatedTranslations) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertQuery = `
      INSERT INTO validated_translations (id, input_model, input_text, output_text,  model, evaluation,sourceLanguage, destinationLanguage)
      VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
      RETURNING id;`;
    const id = uuidv4();
    for (const translation of validatedTranslations) {
      const {
        inputModel,
        inputText,
        outputText,
        sourceLanguage,
        destinationLanguage,
        model,
        evaluation,
      } = translation;

      // Generate a new UUID for each translation
      const res = await client.query(insertQuery, [
        id,
        inputModel,
        inputText,
        outputText,
        model,
        JSON.stringify(evaluation),
        sourceLanguage,
        destinationLanguage,
      ]);
      console.log("Inserted translation with ID:", res.rows[0].id);
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
const app = express();
app.use(cors());
app.use(express.json());

app.post("/translate", async (req, res) => {
  const formData = req.body;
  console.log(formData);
  let translatedText;
  try {
    const { shorter, simpler, moreFormal, lessFormal } = formData;
    if (shorter || simpler || moreFormal || lessFormal) {
      translatedText = await improveTranslation(formData, formData.modelChoice);
    } else {
      translatedText = await translateText(formData, formData.modelChoice);
    }
  } catch (error) {
    translatedText = `Error: Translating backend failed with exception: ${error.message}`;
  }
  res.json({ translate: translatedText });
  console.log("sent data to frontend");
});

app.post("/compareTranslate", async (req, res) => {
  const formData = req.body;
  let translations = [];
  for (const model of formData.selectedModels) {
    try {
      const translatedText = await translateText(formData, model);
      const textToTranslate = formData.message;
      translations.push({
        model: model,
        inputText: textToTranslate,
        translation: translatedText,
        sourceLanguage: formData.sourceLanguage,
        destinationLanguage: formData.destinationLanguage,
        temperatureValue: formData.temperatureValue,
      });
    } catch (error) {
      translations.push({
        model: model,
        inputText: formData.message,
        translation: `Error: Translating backend failed with exception: ${error.message}`,
        sourceLanguage: formData.sourceLanguage,
        destinationLanguage: formData.destinationLanguage,
        temperatureValue: formData.temperatureValue,
      });
    }
  }

  try {
    const validatedTranslations = await evaluateTranslations(translations);
    saveValidatedTranslations(validatedTranslations);
    res.json({ validatedTranslations: validatedTranslations });
  } catch (error) {
    res.json({
      error: `Error: Validation failed with exception: ${error.message}`,
    });
  }

  console.log("sent data to frontend");
});

app.listen(8800, () => {
  console.log("Connected to backend.");
});
