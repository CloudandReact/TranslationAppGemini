import React, { useState } from "react";
import axios from "axios";
import { BeatLoader } from "react-spinners";
import Select from "react-select";
const CompareTranslate = () => {
  const [selectedModels, setSelectedModels] = useState([]);
  const [error, setError] = useState("");
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedModels: [""],
    temperatureValue: 0.3,
    sourceLanguage: "english", // Added source language
    destinationLanguage: "french", // Updated existing language to destinationLanguage
    message: "",
    evaluationResults: {},
    synthesize: false,
  });
  // Example static models list
  const models = {
    "gpt-4o-mini": "gpt-4o-mini",
    "gemini-pro": "gemini-1.5-pro-latest",
    "gemini-flash": "gemini-1.5-flash-latest",
    deepl: "deepl",
  };
  const languageOptions = [
    { value: "arabic", label: "Arabic" },
    { value: "dutch", label: "Dutch" },
    { value: "english", label: "English" },
    { value: "farsi", label: "Farsi" },
    { value: "french", label: "French" },
    { value: "german", label: "German" },
    { value: "greek", label: "Greek" },
    { value: "hebrew", label: "Hebrew" },
    { value: "hindi", label: "Hindi" },
    { value: "italian", label: "Italian" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "mandarin", label: "Mandarin" },
    { value: "polish", label: "Polish" },
    { value: "portuguese", label: "Portuguese" },
    { value: "russian", label: "Russian" },
    { value: "spanish", label: "Spanish" },
    { value: "swedish", label: "Swedish" },
    { value: "thai", label: "Thai" },
    { value: "turkish", label: "Turkish" },
    { value: "vietnamese", label: "Vietnamese" },
    { value: "yiddish", label: "Yiddish" },
  ];
  // Custom styles for react-select
  const customStyles = {
    singleValue: (provided) => ({
      ...provided,
      fontWeight: "bold",
      color: "#1E90FF",
    }),
  };
  // Handle model selection change
  const handleModelChange = (model, isChecked) => {
    let updatedModels;
    if (isChecked) {
      updatedModels = selectedModels.includes(model)
        ? [...selectedModels]
        : [...selectedModels, model];
    } else {
      updatedModels = selectedModels.filter((m) => m !== model);
    }
    setSelectedModels(updatedModels);

    //(updatedModels); // This will now log the most recently updated models list
    setFormData({
      ...formData,
      selectedModels: updatedModels,
    });
  };
  function processTranslations(translationsData, evaluatingModelName) {
    // Initial grouping and processing of translation data
    const groups = translationsData.reduce((acc, item) => {
      const evaluation = JSON.parse(item.evaluation);
      const key = item.inputText;
      if (!acc[key]) {
        acc[key] = { models: {} };
      }
      if (!acc[key].models[item.inputModel]) {
        acc[key].models[item.inputModel] = { details: [] };
      }
      acc[key].models[item.inputModel].details.push({
        score: evaluation.score,
        comment: evaluation.comment,
        translation: item.outputText, // doesnt exist
        modelName: item.inputModel, // Model that provided the translation
        evaluatingModelName: item.model, // Model that evaluated the output
      });
      return acc;
    }, {});

    // Calculate average scores and store details
    Object.values(groups).forEach((group) => {
      Object.entries(group.models).forEach(([modelName, modelData]) => {
        const totalScore = modelData.details.reduce(
          (sum, detail) => sum + detail.score,
          0
        );
        const averageScore = totalScore / modelData.details.length;
        group.models[modelName].average = averageScore;
      });
    });

    // Identify top models (up to 5) and adjust details to include model name and evaluating model name
    const sortedGroups = Object.entries(groups)
      .map(([inputText, data]) => {
        const modelsRanked = Object.entries(data.models)
          .sort((a, b) => b[1].average - a[1].average)
          .slice(0, 5) // Select up to the top 5 models
          .map(([modelName, modelData]) => ({
            modelName,
            average: modelData.average,
            details: modelData.details.map((detail) => ({
              ...detail,
              modelName: modelName, // Ensure model name is included in each detail
              evaluatingModelName: evaluatingModelName, // Include evaluating model name in each detail
            })),
          }));

        return { inputText, models: modelsRanked };
      })
      .sort((a, b) => b.models[0].average - a.models[0].average);

    // Example of how you might use sortedGroups for further processing or output
    console.log(sortedGroups);
    return sortedGroups;
  }

  const CompareTranslateResponses = async () => {
    // how do I keep a history backend of all text translated hmm keep context going each different
    try {
      //http://localhost:8800/compareTranslate
      const res = await axios.post(
        "https://geminibackend.onrender.com/compareTranslate",
        formData
      );
      const translationsData = res.data.validatedTranslations;
      console.log(translationsData)
      const processedData = await processTranslations(translationsData);
      console.log(processedData)
      setEvaluationResults(processedData);
      setIsLoading(false);
      setError("");
    } catch (err) {
      console.log(err);
      setError(true);
    }
  };

  const handleInputChange = (e, { name } = {}) => {
    if (name) {
      // For react-select
      setFormData({ ...formData, [name]: e.value });
    } else if (e.target.name !== "selectedModels") {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    } else {
      setFormData({
        ...formData,
        selectedModels: selectedModels,
      });
    }

    setError("");
  };

  // Handle text input change

  // Define onSubmit logic directly inside the component
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    // Check if the message is more than 20 words
    const wordCount = formData.message.trim().split(/\s+/).length;
    if (wordCount > 40) {
      setError("The message must be less than 40 words.");
      return;
    }
    if (selectedModels.length === 0) {
      setError("Please select at least one model for comparison.");
      return;
    }
    // Example onSubmit logic
    const results = `Submitted text: ${
      formData.message
    } with models: ${selectedModels.join(", ")}`;
    setFormData;
    setIsLoading(true);
    CompareTranslateResponses();
  };

  return (
    <div className="container">
      <h1>Compare Translations</h1>

      <form onSubmit={handleSubmit}>
        <div className="temperatureChoices">
          <input
            type="radio"
            id="serious"
            name="temperatureValue"
            value="0.3"
            defaultChecked={formData.temperatureValue}
            onChange={handleInputChange}
          />
          <label htmlFor="serious">Serious</label>

          <input
            type="radio"
            id="mild"
            name="temperatureValue"
            value="0.9"
            onChange={handleInputChange}
          />
          <label htmlFor="mild">Mild</label>
        </div>
        <div className="translation-options">
          <div className="source-language">
            <label >From</label>
            <Select
              id="sourceLanguage"
              name="sourceLanguage"
              options={languageOptions}
              onChange={(selectedOption) =>
                handleInputChange(selectedOption, { name: "sourceLanguage" })
              }
              defaultValue={languageOptions.find(
                (option) => option.value === formData.sourceLanguage
              )}
              styles={customStyles} // Setting default source language to English
            />
          </div>
          <div className="destination-language">
            <label >To</label>
            <Select
              id="destinationLanguage"
              name="destinationLanguage"
              options={languageOptions}
              onChange={(selectedOption) =>
                handleInputChange(selectedOption, {
                  name: "destinationLanguage",
                })
              }
              defaultValue={languageOptions.find(
                (option) => option.value === formData.destinationLanguage
              )}
              styles={customStyles} // Setting default destination language to French
            />
          </div>
        </div>
        <textarea
          className="translateText"
          name="message"
          onChange={handleInputChange}
          placeholder="Enter text to translate"
        />
        <div className="modelChoices">
          {Object.entries(models).map(([key, value]) => (
            <div key={key}>
              <input
                type="checkbox"
                id={key}
                name={key}
                value={value}
                onChange={(e) => handleModelChange(value, e.target.checked)}
              />
              <label htmlFor={key}>{key}</label>
            </div>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="submitButton">
          Evaluate
        </button>
      </form>
      {evaluationResults.length > 0 && (
        <div className="results">
          <table>
            <thead>
              <tr>
                <th>Input Text</th>
                <th>Model Name</th>
                <th>Avg Score /10</th>
                <th>Translation</th>
              </tr>
            </thead>
            <tbody>
              {evaluationResults.map((result, index) =>
                result.models.map((model, modelIndex) => (
                  <React.Fragment key={modelIndex}>
                    {model.details.map((detail, detailIndex) => (
                      <tr key={detailIndex}>
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {result.inputText}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {model.modelName}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {model.average}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {detail.translation}
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {isLoading ? <BeatLoader size={12} color={"red"} /> : null}
      <div className="demo-link">
        <a
          href="https://youtu.be/zaO9I-bLJsc"
          target="_blank"
          rel="noopener noreferrer"
        >
          Video demo different models
        </a>
      </div>
    </div>
  );
};

export default CompareTranslate;
