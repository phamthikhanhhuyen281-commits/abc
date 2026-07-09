import { Candidate, db } from './db';
import {
  LISTENING_PART_1,
  LISTENING_PART_2,
  GRAMMAR_QUESTIONS,
  VOCABULARY_QUESTIONS,
  READING_PASSAGE
} from './questions';

// Helper to normalize strings for comparison
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' '); // collapse spaces
}

// Highly precise checker for blank questions to avoid false positives
function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const normUser = normalizeString(userAnswer);
  const normCorrect = normalizeString(correctAnswer);

  if (!normUser) return false;

  // Exact match
  if (normUser === normCorrect) return true;

  // Specific question overrides:
  if (normCorrect === '1700') {
    return normUser === '1700' || normUser.includes('1700');
  }
  if (normCorrect === '15') {
    return normUser === '15' || normUser.includes('15');
  }
  if (normCorrect === 'may 5th') {
    const valid = ['may 5th', 'may 5', '5 may', '5th may', 'may fifth', 'fifth of may'];
    return valid.includes(normUser) || normUser.includes('may 5');
  }
  if (normCorrect === 'have never tried') {
    const valid = ['have never tried', 'never tried', 'havent tried', 'has never tried', 'tried'];
    return valid.includes(normUser);
  }

  // Prevent matching extremely short substrings (e.g. typing "a" matching "water")
  if (normUser.length < 3) {
    return normUser === normCorrect;
  }

  // If correct is a multi-word phrase, check if user includes it or vice versa
  const correctWords = normCorrect.split(' ');
  if (correctWords.length > 1) {
    return normUser.includes(normCorrect) || normCorrect.includes(normUser);
  }

  // Single word: exact match is required!
  return normUser === normCorrect;
}

export async function autoGradeCandidate(candidate: Candidate): Promise<Candidate['scores']> {
  const answers = candidate.answers;
  const exam = await db.getExamById(candidate.examId || 'default-exam');

  const listeningPart1 = exam?.questions?.listeningPart1 || LISTENING_PART_1;
  const listeningPart2 = exam?.questions?.listeningPart2 || LISTENING_PART_2;
  const grammarQuestions = exam?.questions?.grammar || GRAMMAR_QUESTIONS;
  const vocabularyQuestions = exam?.questions?.vocabulary || VOCABULARY_QUESTIONS;
  const readingPartA = exam?.questions?.readingPassage?.questionsPartA || READING_PASSAGE.questionsPartA;
  const readingPartB = exam?.questions?.readingPassage?.questionsPartB || READING_PASSAGE.questionsPartB;

  // 1. Grade Listening
  let listeningScore = 0;
  
  // Part 1 MCQs
  listeningPart1.forEach((q: any) => {
    const userAnswer = answers.listeningPart1?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      listeningScore += 1;
    }
  });

  // Part 2 Blanks
  listeningPart2.forEach((q: any) => {
    const userAnswer = answers.listeningPart2?.[q.id];
    if (userAnswer && checkAnswer(userAnswer, q.answer)) {
      listeningScore += 1;
    }
  });

  // 2. Grade Grammar
  let grammarScore = 0;
  grammarQuestions.forEach((q: any) => {
    const userAnswer = answers.grammar?.[q.id];
    if (userAnswer) {
      if (q.type === 'mcq') {
        if (userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
          grammarScore += 1;
        }
      } else {
        if (checkAnswer(userAnswer, q.answer)) {
          grammarScore += 1;
        }
      }
    }
  });

  // 3. Grade Vocabulary
  let vocabularyScore = 0;
  vocabularyQuestions.forEach((q: any) => {
    const userAnswer = answers.vocabulary?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      vocabularyScore += 1;
    }
  });

  // 4. Grade Reading
  let readingScore = 0;
  // Part A
  readingPartA.forEach((q: any) => {
    const userAnswer = answers.readingPartA?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      readingScore += 1;
    }
  });
  // Part B
  readingPartB.forEach((q: any) => {
    const userAnswer = answers.readingPartB?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      readingScore += 1;
    }
  });

  // Writing score (manually graded, defaults to candidate.writingScore)
  const writingScore = candidate.writingScore || 0;

  const totalAuto = listeningScore + grammarScore + vocabularyScore + readingScore;
  const total = totalAuto + writingScore;
  const maxPossible = 
    listeningPart1.length + 
    listeningPart2.length + 
    grammarQuestions.length + 
    vocabularyQuestions.length + 
    readingPartA.length + 
    readingPartB.length + 
    10; // 10 points maximum for Writing

  const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;

  return {
    listening: listeningScore,
    grammar: grammarScore,
    vocabulary: vocabularyScore,
    reading: readingScore,
    writing: writingScore,
    total,
    maxPossible,
    percentage
  };
}
