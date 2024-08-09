import OpenAI from "openai";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import React, { useState } from "react";
import Select from "react-select";
const Translator = () => {
  const [formData, setFormData] = useState({
    modelChoice: "gemini-1.5-flash-latest",
    temperatureValue: 0.3,
    sourceLanguage: "english", // Added source language
    destinationLanguage: "french", // Updated existing language to destinationLanguage
    message: "",
    translationText:"",
    synthesize: false,
    moreFormal: false,
    lessFormal: false,
    simpler: false,
    shorter: false
  });
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
  const [error, setError] = useState("");
  const [showNotification, setShowNotification] = useState(false);

  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  const handleInputChange = (selectedOption, { name } = {}) => {
    if (name) {
      // For react-select
      setFormData({ ...formData, [name]: selectedOption.value });
    } else if (selectedOption.target) {
      const { type, name, checked, value } = selectedOption.target;
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
    //console.log(formData);
    setError("");
  };


  const translateBackend = async () => {
    //""
    // how do I keep a history backend of all text translated hmm keep context going each different
    try {
      console.log("sent form request");
      const res = await axios.post("https://geminibackend.onrender.com/translate", formData);
      //console.log("getting response");
      //console.log(res);
     // console.log(res.data.translate);
      setIsLoading(false);
      setTranslation(res.data.translate);
      setShowCheckboxes(true);
      setFormData(prevFormData => ({
        ...prevFormData,
        translationText: res.data.translate,
        simpler: false,
        shorter: false,
        moreFormal: false,
        lessFormal: false
      }));
    } catch (err) {
      console.log(err);
      setError(true);
    }
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();
    setShowCheckboxes(false);
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    // Check if the message is more than 20 words
    const wordCount = formData.message.trim().split(/\s+/).length;
    if (wordCount > 160) {
      setError("The message must be less than 160 words.");
      return;
    }
    setIsLoading(true);
    translateBackend();
  };

    // Custom styles for react-select
    const customStyles = {
      singleValue: (provided) => ({
        ...provided,
        fontWeight: 'bold',
         color: '#1E90FF'
      }),
    };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(translation)
      .then(() => displayNotification())
      .catch((err) => console.error("failed to copy: ", err));
  };

  const displayNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  return (
    <div className="container">
      <h1>Translation</h1>

      <form onSubmit={handleOnSubmit}>
        <div className="modelChoices">
          <input
            type="radio"
            id="GeminiPro1.5"
            name="modelChoice"
            value="gemini-1.5-pro-latest"
            onChange={handleInputChange}
          />
          <label htmlFor="GeminiPro1.5">GemPro</label>
          <input
            type="radio"
            id="GeminiFlash"
            name="modelChoice"
            value="gemini-1.5-flash-latest"
            onChange={handleInputChange}
            defaultChecked
          />
          <label htmlFor="GeminiFlash">GemFlash</label>
        </div>
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
            <label>From</label>
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
              styles={customStyles}
            />
          </div>
          <div className="destination-language">
            <label>To</label>
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
              styles={customStyles}
            />
          </div>
        </div>

        <textarea
          name="message"
          placeholder="Type your message here.."
          onChange={handleInputChange}
        ></textarea>
        {showCheckboxes && (
          <div className="translation-checkboxes">
            <label>
              <input
                type="checkbox"
                name="moreFormal"
                checked={formData.moreFormal}
                onChange={handleInputChange}
              />
              More Formal
            </label>
            <label>
              <input
                type="checkbox"
                name="lessFormal"
                checked={formData.lessFormal}
                onChange={handleInputChange}
              />
              Less Formal
            </label>
            <label>
              <input
                type="checkbox"
                name="simpler"
                checked={formData.simpler}
                onChange={handleInputChange}
              />
              Simpler
            </label>
            <label>
              <input
                type="checkbox"
                name="shorter"
                checked={formData.shorter}
                onChange={handleInputChange}
              />
              Shorter
            </label>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button type="submit">Translate</button>
      </form>

      <div className="translation">
        <div className="copy-btn" onClick={handleCopy}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
        </div>
        {isLoading ? <BeatLoader size={12} color={"red"} /> : translation}
      </div>

      <div className={`notification ${showNotification ? "active" : ""}`}>
        Copied to clipboard!
      </div>
      <div className="demo-link">
        <a
          href="https://youtu.be/024O7ulMLYw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Video demo different models
        </a>
      </div>
    </div>
  );
};

export default Translator;
