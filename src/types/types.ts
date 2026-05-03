export interface QuestionOption {
    key: string;
    text: string;
}

export interface Question {
    id: number;
    question: string;
    options: QuestionOption[];
    correctAnswers: string[];
}

export interface QuizState {
    currentIndex: number;
    score: number;
    selectedAnswer: string | null;
    showSolution: boolean;
}
