import questions from "../src/conversor/questions.json";
import Quiz from "./Components/Quiz";
import "./App.css";

function App() {
    return (
        <>
            <Quiz questions={questions} />
        </>
    );
}

export default App;
