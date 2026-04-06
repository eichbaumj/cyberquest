import { Question } from '@/engine/objects/InteractiveObject';

/**
 * Validate a user's answer against the correct answer
 *
 * @param question - The question object with type and correct_answer
 * @param userAnswer - The user's submitted answer
 * @returns true if answer is correct
 */
export function validateAnswer(
  question: Question,
  userAnswer: string | boolean
): boolean {
  const { type, correct_answer } = question;

  switch (type) {
    case 'multiple_choice':
      // correct_answer is the option id (e.g., 'a', 'b', 'c', 'd')
      return userAnswer === correct_answer;

    case 'true_false':
      // correct_answer is boolean
      return userAnswer === correct_answer;

    case 'terminal_command':
      // correct_answer is string or array of valid answers
      const validAnswers = Array.isArray(correct_answer)
        ? correct_answer
        : [correct_answer];

      const normalizedUser = String(userAnswer).trim().toLowerCase();

      // Check if user's answer matches any valid answer (case-insensitive)
      return validAnswers.some((valid) => {
        const normalizedValid = String(valid).trim().toLowerCase();
        return normalizedUser === normalizedValid;
      });

    default:
      return false;
  }
}
