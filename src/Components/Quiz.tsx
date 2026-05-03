import { useState, useEffect } from "react";
import Question from "./Question";
import type { Question as QuestionType } from "../types/types";

interface QuizProps {
    questions: QuestionType[];
}

export default function Quiz({ questions }: QuizProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizQuestions, setQuizQuestions] = useState<QuestionType[]>([]);

    const STORAGE_KEY = "practiceQuizProgress";

    const saveProgress = () => {
        try {
            const state = {
                currentIndex,
                score,
                questionsLength: quizQuestions.length,
                selectedIds: quizQuestions.map((q) => q.id),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn("Failed to save quiz progress:", e);
        }
    };

    const loadProgress = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed) {
                // If a selectedIds array exists, try to restore the same selection
                if (
                    Array.isArray(parsed.selectedIds) &&
                    parsed.selectedIds.length > 0
                ) {
                    const mapped = parsed.selectedIds
                        .map((id: any) => questions.find((q) => q.id === id))
                        .filter(Boolean) as QuestionType[];
                    if (mapped.length === parsed.selectedIds.length) {
                        setQuizQuestions(mapped);
                    }
                }

                if (typeof parsed.currentIndex === "number") {
                    setCurrentIndex(
                        Math.min(
                            parsed.currentIndex,
                            parsed.questionsLength ?? questions.length
                        )
                    );
                }
                if (typeof parsed.score === "number") {
                    setScore(parsed.score);
                }
            }
        } catch (e) {
            console.warn("Failed to load quiz progress:", e);
        }
    };

    const shuffle = <T,>(arr: T[]) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const generateSelection = () => {
        if (!questions || questions.length === 0) return [] as QuestionType[];
        if (questions.length <= 60) return questions.slice();
        return shuffle(questions).slice(0, 60);
    };

    // Initialize the quizQuestions when questions prop changes
    useEffect(() => {
        setQuizQuestions((prev) => (prev.length ? prev : generateSelection()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions]);

    const currentQuestion = quizQuestions[currentIndex];

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) setScore((prev) => prev + 1);
        setCurrentIndex((prev) => prev + 1);
    };

    const resetQuiz = () => {
        setCurrentIndex(0);
        setScore(0);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn("Failed to clear quiz progress:", e);
        }
        // regenerate selection
        setQuizQuestions(generateSelection());
    };

    if (!currentQuestion) {
        const percentage = Math.round((score / quizQuestions.length) * 100);
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-5">
                <div className="bg-white rounded-2xl p-12 max-w-2xl w-full text-center shadow-2xl animate-in zoom-in duration-500">
                    <h2 className="text-4xl font-bold mb-8 text-gray-800">
                        Quiz Completed! 🎉
                    </h2>

                    <div className="mb-8 p-6 bg-gray-100 rounded-xl">
                        <p className="text-gray-700 text-xl mb-3">
                            Your Score:{" "}
                            <span className="text-blue-600 font-bold text-2xl">
                                {score}
                            </span>{" "}
                            /{" "}
                            <span className="text-gray-500 font-semibold">
                                {quizQuestions.length}
                            </span>
                        </p>
                        <p className="text-purple-700 font-bold text-2xl">
                            {percentage}% Correct
                        </p>
                    </div>

                    <div className="mb-8">
                        {percentage === 100 ? (
                            <p className="p-4 bg-green-100 border-l-4 border-green-500 text-green-800 rounded text-lg font-semibold">
                                ✓ Perfect Score! Excellent work!
                            </p>
                        ) : percentage >= 80 ? (
                            <p className="p-4 bg-blue-100 border-l-4 border-blue-600 text-blue-800 rounded text-lg font-semibold">
                                ✓ Great Job! You've mastered most topics!
                            </p>
                        ) : percentage >= 60 ? (
                            <p className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded text-lg font-semibold">
                                → Good effort. Keep studying!
                            </p>
                        ) : (
                            <p className="p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded text-lg font-semibold">
                                ✗ Keep practicing. You'll improve!
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={resetQuiz}
                            className="flex-1 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white font-bold rounded-lg"
                        >
                            Retake Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const progress =
        ((currentIndex + 1) / Math.max(1, quizQuestions.length)) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 to-purple-700 p-3 sm:p-4 lg:p-6 font-sans">
            <div className="flex flex-col h-full w-full">
                <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 mb-4 shadow-lg flex-shrink-0">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 text-center">
                        Salesforce Developer I
                    </h1>

                    <div className="flex flex-col gap-3 sm:gap-4 mt-4">
                        <p className="text-gray-600 font-semibold text-center">
                            Question {currentIndex + 1} of{" "}
                            {quizQuestions.length}
                        </p>
                        <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-purple-700 rounded-full"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-gray-800 font-bold text-center">
                            Score: {score} / {quizQuestions.length}
                        </p>

                        <div className="flex gap-3 justify-center mt-3">
                            <button
                                onClick={saveProgress}
                                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm"
                            >
                                Save Progress
                            </button>
                            <button
                                onClick={loadProgress}
                                className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg text-sm"
                            >
                                Load Progress
                            </button>
                            <button
                                onClick={resetQuiz}
                                className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-sm"
                            >
                                Restart Quiz
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg">
                    <Question
                        question={currentQuestion}
                        onAnswer={handleAnswer}
                    />
                </div>
            </div>
        </div>
    );
}
