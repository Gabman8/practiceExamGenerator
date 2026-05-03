from pathlib import Path
import json
import re
import pdfplumber

def parse_pdf_to_json(pdf_path):
    """Parse a developer-provided exam PDF into quiz question data."""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(
            page.extract_text() for page in pdf.pages if page.extract_text()
        )

    # Extract question blocks that begin at each "QUESTION NO:" marker.
    matches = list(re.finditer(r"QUESTION NO:\s*\d+", text, re.IGNORECASE)) + list(re.finditer(r"NO.\s*\d+", text, re.IGNORECASE))
    raw_questions = []
    if not matches:
        raw_questions = [text]
    else:
        for i, match in enumerate(matches):
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            raw_questions.append(text[start:end])

    questions = []
    question_id = 1
    # Diagnostic counters help inspect blocks that were incomplete or parsed loosely.
    total_blocks = len(raw_questions)
    missing_answer_count = 0
    no_option_start_count = 0
    invalid_question_count = 0
    skipped_details = []

    option_start_pattern = re.compile(r"^\(?([A-Ea-e]|\d+)\)?[\.\)\-]?\s+")

    # Patterns that should not be treated as question content.
    ignore_patterns = [
        r"IT Certification Guaranteed, The Easy Way!",
        r"Explanation:",
        r"Reference:",
        r"Copyright",
        r"Page \d+ of \d+",
    ]
    compiled_ignore_patterns = [re.compile(p, re.IGNORECASE) for p in ignore_patterns]
    end_number_cleaner = re.compile(r"\s*\d+\s*$")

    for block_index, block in enumerate(raw_questions, start=1):
        lines = [line.strip() for line in block.split("\n") if line.strip()]

        # Stop reading the block when "Explanation" starts because it marks
        # the end of the usable question content.
        exp_idx = next(
            (
                i
                for i, line in enumerate(lines)
                if re.match(r"^\s*explanation[:\s]?", line, re.IGNORECASE)
            ),
            None,
        )
        if exp_idx is not None:
            lines = lines[:exp_idx]

        # Locate the answer line flexibly and case-insensitively.
        answer_line = next(
            (
                line
                for line in lines
                if re.match(r"^\s*answer[:\s]", line, re.IGNORECASE)
            ),
            None,
        )
        if not answer_line:
            missing_answer_count += 1
            skipped_details.append(
                {
                    "index": block_index,
                    "reason": "missing Answer line",
                    "preview": lines[0] if lines else "<empty>",
                }
            )
            answer_text = ""
            correct_answers = []
        else:
            # Extract correct answers robustly.
            # Supports formats such as "A B", "A,B", "A,B,C", "1 2", and "1,2".
            answer_text = re.sub(
                r"(?i)^\s*answer[:\s]*", "", answer_line
            ).strip()
            correct_answers = [
                match.upper() for match in re.findall(r"[A-Ea-e]|\d+", answer_text)
            ]

        first_option_index = None
        for i, line in enumerate(lines):
            if option_start_pattern.match(line):
                first_option_index = i
                break

        if first_option_index is None:
            no_option_start_count += 1
            skipped_details.append(
                {
                    "index": block_index,
                    "reason": "no option start detected",
                    "preview": lines[0] if lines else "<empty>",
                }
            )
            # Do not continue here; still create the question record even if
            # no options were detected by the main matcher.
            first_option_index = len(lines)

        question_lines = lines[:first_option_index]

        options = []
        current_option = None

        for i in range(first_option_index, len(lines)):
            line = lines[i]

            # Stop parsing options once an answer line is reached.
            if re.match(r"^\s*answer[:\s]", line, re.IGNORECASE):
                break

            # Keep option text intact here.
            # Earlier filtering at this stage caused missing option content.
            match = option_start_pattern.match(line)
            # Clear line with compiled_ignore_patterns before checking for option start to avoid false positives.
            if any(pattern.search(line) for pattern in compiled_ignore_patterns):
                continue
            if match:
                # Start a new option block.
                if current_option is not None:
                    # Clean trailing page numbers before saving the previous option.
                    cleaned = end_number_cleaner.sub("", current_option["text"]).strip()
                    if cleaned:
                        current_option["text"] = cleaned
                    options.append(current_option)

                key = match.group(1).upper()
                text_content = line[len(match.group(0)) :].strip()

                # If the option line has no text after the label, use the label
                # itself so the exported JSON never contains an empty option body.
                if not text_content:
                    text_content = key

                current_option = {"key": key, "text": text_content}
            elif current_option is not None:
                # Continuation line for the current option.
                if line.strip():
                    current_option["text"] += " " + line.strip()

        # Make sure the last option is cleaned and appended.
        if current_option is not None:
            # Clean a trailing page number without stripping legitimate content.
            cleaned = end_number_cleaner.sub("", current_option["text"]).strip()
            if cleaned:
                current_option["text"] = cleaned

            # Never append an option with empty text; fall back to its key.
            if not current_option.get("text"):
                current_option["text"] = current_option.get("key", "")
            options.append(current_option)

        # Fallback: if options were not found line by line, try inline extraction
        # from the full block text.
        if not options:
            block_text = "\n".join(lines)
            inline_matches = list(option_start_pattern.finditer(block_text))
            if inline_matches:
                options = []
                for j, match in enumerate(inline_matches):
                    key = match.group(1).upper()
                    start = match.end()
                    end = (
                        inline_matches[j + 1].start()
                        if j + 1 < len(inline_matches)
                        else len(block_text)
                    )
                    text_content = block_text[start:end].strip()
                    text_content = end_number_cleaner.sub("", text_content).strip()
                    if not text_content:
                        text_content = key
                    options.append({"key": key, "text": text_content})

        # Clean question text without removing legitimate sentence starts.
        question_text_lines = []
        for line in question_lines:
            if line.lower().startswith("explanation"):
                continue
            if any(pattern.search(line) for pattern in compiled_ignore_patterns):
                continue
            question_text_lines.append(line)

        question_text = " ".join(question_text_lines).strip()

        # If the question text is empty or too short and the first option looks
        # like the full question, promote that option into the question text.
        if (not question_text or len(question_text) < 30) and options:
            first_opt_text = options[0]["text"].strip()
            if "?" in first_opt_text or len(first_opt_text) > 80:
                question_text = first_opt_text
                options.pop(0)

        # Ensure every option has non-empty text.
        for option in options:
            if not option.get("text") or not str(option.get("text")).strip():
                option["text"] = option.get("key", "")

        if not question_text or not options:
            invalid_question_count += 1
            skipped_details.append(
                {
                    "index": block_index,
                    "reason": "empty question text or no options after parsing",
                    "preview": question_text
                    or (options[0]["text"] if options else "<no options>"),
                    "answerLine": answer_text,
                }
            )

        # Add the question entry even if incomplete so every source block is
        # represented in the output for manual review.
        questions.append(
            {
                "id": question_id,
                "question": question_text.strip(),
                "options": options,
                "correctAnswers": correct_answers,
            }
        )

        question_id += 1

    diagnostics = {
        "total_blocks": total_blocks,
        "parsed_questions": len(questions),
        "missing_answer_count": missing_answer_count,
        "no_option_start_count": no_option_start_count,
        "invalid_question_count": invalid_question_count,
        "skipped_details": skipped_details,
    }

    return questions, diagnostics


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent
    pdf_path = base_dir / "questions.pdf"
    output_json_path = base_dir / "questions.json"

    # The developer must provide questions.pdf locally to generate questions.json.
    # This repository does not include questions.pdf.
    if not pdf_path.exists():
        raise FileNotFoundError(
            f"Missing required input file: {pdf_path}. "
            "Provide your own questions.pdf locally; it is not included in this repository."
        )

    data, diagnostics = parse_pdf_to_json(pdf_path)

    with open(output_json_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)

    print(f"Generated {len(data)} questions successfully.")
    print("Diagnostic summary:")
    print(f"  Total blocks found: {diagnostics['total_blocks']}")
    print(f"  Parsed questions: {diagnostics['parsed_questions']}")
    print(f"  Missing Answer lines: {diagnostics['missing_answer_count']}")
    print(f"  No option start detected: {diagnostics['no_option_start_count']}")
    print(f"  Invalid (empty text/options): {diagnostics['invalid_question_count']}")
    
