import { useState } from "react";
import type { Question as QuestionType, QuestionOption } from "../types/types";

interface QuestionProps {
    question: QuestionType;
    onAnswer: (isCorrect: boolean) => void;
}

export default function Question({ question, onAnswer }: QuestionProps) {
    const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(
        new Set()
    );
    const [showSolution, setShowSolution] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState(false);

    const isMultipleChoice = question.correctAnswers.length > 1;

    const handleOptionChange = (optionKey: string) => {
        if (isMultipleChoice) {
            // Multiple choice - can select multiple
            const newAnswers = new Set(selectedAnswers);
            if (newAnswers.has(optionKey)) {
                newAnswers.delete(optionKey);
            } else {
                newAnswers.add(optionKey);
            }
            setSelectedAnswers(newAnswers);
        } else {
            // Single choice - only one selection
            const newAnswers = new Set([optionKey]);
            setSelectedAnswers(newAnswers);
        }
    };

    const handleSubmit = () => {
        const selectedArray = Array.from(selectedAnswers).sort();
        const correctArray = [...question.correctAnswers].sort();

        const isCorrect =
            selectedArray.length === correctArray.length &&
            selectedArray.every((val, index) => val === correctArray[index]);

        setAnswered(true);
        setIsLastAnswerCorrect(isCorrect);
        // NO llama a onAnswer aquí - espera a que el usuario haga clic en "Next Question"
    };

    const handleNext = () => {
        setSelectedAnswers(new Set());
        setShowSolution(false);
        setAnswered(false);

        // Avanza a la siguiente pregunta con el resultado correcto
        onAnswer(isLastAnswerCorrect);
    };

    const isAnswerCorrect =
        selectedAnswers.size === question.correctAnswers.length &&
        Array.from(selectedAnswers)
            .sort()
            .every(
                (val, index) => val === question.correctAnswers.sort()[index]
            );

    return (
        <div className="w-full">
            {/* Question Header */}
            <div className="mb-6 sm:mb-8 lg:mb-10">
                <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-800 leading-relaxed">
                    {question.question}
                </h2>
            </div>

            {/* Options Container */}
            <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5 mb-8 lg:mb-10">
                {question.options.map((option: QuestionOption) => {
                    const isSelected = selectedAnswers.has(option.key);
                    const isCorrectOption = question.correctAnswers.includes(
                        option.key
                    );

                    let optionClassName =
                        "bg-gray-50 border-2 border-gray-300 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 transition-all duration-300 cursor-pointer ";

                    optionClassName += isSelected
                        ? "bg-blue-50 border-blue-500 "
                        : "hover:border-blue-400 hover:bg-blue-50 hover:translate-x-1 ";

                    if (showSolution || answered) {
                        if (isCorrectOption) {
                            optionClassName =
                                "bg-green-100 border-2 border-green-500 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 ";
                        } else if (isSelected && !isCorrectOption) {
                            optionClassName =
                                "bg-red-100 border-2 border-red-500 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 ";
                        }
                    }

                    return (
                        <div key={option.key} className={optionClassName}>
                            <label className="flex items-start gap-3 sm:gap-4 lg:gap-5 cursor-pointer">
                                <input
                                    type={
                                        isMultipleChoice ? "checkbox" : "radio"
                                    }
                                    name={`question-${question.id}`}
                                    value={option.key}
                                    checked={isSelected}
                                    onChange={() =>
                                        handleOptionChange(option.key)
                                    }
                                    disabled={answered}
                                    className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mt-0.5 cursor-pointer accent-blue-600 flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                                <span className="font-bold text-blue-600 min-w-fit flex-shrink-0 text-base sm:text-lg lg:text-xl xl:text-2xl">
                                    {option.key}.
                                </span>
                                <span className="text-left leading-relaxed text-gray-700 flex-1 text-base sm:text-lg lg:text-xl xl:text-2xl">
                                    {option.text}
                                </span>
                            </label>
                        </div>
                    );
                })}
            </div>

            {/* Solution Container */}
            {showSolution && (
                <div className="mb-8 lg:mb-10 p-4 sm:p-5 lg:p-6 bg-blue-50 border-l-4 lg:border-l-8 border-blue-500 rounded-lg lg:rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="m-0 mb-2 sm:mb-3 text-blue-700 font-semibold text-base sm:text-lg lg:text-xl">
                        Correct Answer(s):
                    </h3>
                    <p className="m-0 text-lg sm:text-xl lg:text-2xl xl:text-3xl text-blue-900 font-bold">
                        {question.correctAnswers.join(", ")}
                    </p>
                </div>
            )}

            {/* Button Container */}
            <div className="flex gap-3 sm:gap-4 lg:gap-5 mb-5 sm:mb-6 lg:mb-8 flex-wrap">
                {!answered ? (
                    <>
                        <button
                            onClick={() => setShowSolution(!showSolution)}
                            className="flex-1 min-w-[120px] sm:min-w-[150px] px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg lg:rounded-xl uppercase text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {showSolution ? "Hide Solution" : "Show Solution"}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={selectedAnswers.size === 0}
                            className="flex-1 min-w-[120px] sm:min-w-[150px] px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white font-bold rounded-lg lg:rounded-xl uppercase text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit Answer
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex-1 min-w-[120px] sm:min-w-[150px] px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg lg:rounded-xl uppercase text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                    >
                        Next Question
                    </button>
                )}
            </div>

            {/* Feedback Container */}
            {answered && (
                <div
                    className={`mt-6 sm:mt-8 lg:mt-10 p-4 sm:p-5 lg:p-6 rounded-lg lg:rounded-xl animate-in fade-in duration-300 ${
                        isAnswerCorrect
                            ? "bg-green-100 border-l-4 lg:border-l-8 border-green-500"
                            : "bg-red-100 border-l-4 lg:border-l-8 border-red-500"
                    }`}
                >
                    {isAnswerCorrect ? (
                        <p className="m-0 text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                            ✓ Correct! Well done!
                        </p>
                    ) : (
                        <p className="m-0 text-lg sm:text-xl lg:text-2xl font-bold text-red-800">
                            ✗ Incorrect. The correct answer(s) is/are:{" "}
                            <strong className="text-red-900">
                                {question.correctAnswers.join(", ")}
                            </strong>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
