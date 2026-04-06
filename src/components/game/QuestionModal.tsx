'use client';

import { useState, useEffect, useCallback } from 'react';
import { Question } from '@/engine/objects/InteractiveObject';

interface QuestionModalProps {
  question: Question;
  onSubmit: (answer: string | boolean) => void;
  onClose: () => void;
  timeLimit?: number;
}

export function QuestionModal({
  question,
  onSubmit,
  onClose,
  timeLimit = 30,
}: QuestionModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null
  );
  const [terminalInput, setTerminalInput] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Extract question text (handle both string and object content)
  const questionText =
    typeof question.content === 'string'
      ? question.content
      : (question.content as any)?.text || question.content;

  // Timer countdown
  useEffect(() => {
    if (hasSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit with current answer or empty
          if (!hasSubmitted) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasSubmitted]);

  const handleSubmit = useCallback(() => {
    if (hasSubmitted) return;
    setHasSubmitted(true);

    if (question.type === 'terminal_command') {
      onSubmit(terminalInput || '');
    } else if (selectedAnswer !== null) {
      onSubmit(selectedAnswer);
    } else {
      // No answer selected, submit empty (will be marked incorrect)
      onSubmit('');
    }
  }, [question.type, terminalInput, selectedAnswer, onSubmit, hasSubmitted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSubmitted) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (question.type === 'multiple_choice' && question.options) {
        const keyMap: Record<string, number> = {
          '1': 0,
          '2': 1,
          '3': 2,
          '4': 3,
        };
        const optionIndex = keyMap[e.key];
        if (
          optionIndex !== undefined &&
          question.options[optionIndex]
        ) {
          const option = question.options[optionIndex];
          setSelectedAnswer(typeof option === 'string' ? option : (option as any).id || String.fromCharCode(97 + optionIndex));
        }
      }

      if (question.type === 'true_false') {
        if (e.key.toLowerCase() === 't') setSelectedAnswer(true);
        if (e.key.toLowerCase() === 'f') setSelectedAnswer(false);
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        if (question.type === 'terminal_command' || selectedAnswer !== null) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnswer, question, handleSubmit, hasSubmitted, onClose]);

  const timerPercent = (timeRemaining / timeLimit) * 100;
  const timerColor = timeRemaining <= 10 ? 'bg-red-500' : 'bg-cyber-blue';
  const timerTextColor =
    timeRemaining <= 10 ? 'text-red-500' : 'text-cyber-blue';

  // Parse options - handle both string[] and {id, text}[] formats
  const parsedOptions = question.options?.map((opt, index) => {
    if (typeof opt === 'string') {
      return { id: String.fromCharCode(97 + index), text: opt };
    }
    return opt as { id: string; text: string };
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border border-border rounded-lg w-full max-w-2xl shadow-2xl">
        {/* Timer bar */}
        <div className="h-2 bg-cyber-darker rounded-t-lg overflow-hidden">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">
              {question.type.replace('_', ' ')}
            </span>
            <span
              className={`text-lg font-mono font-bold ${timerTextColor}`}
            >
              {timeRemaining}s
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-xl font-semibold mb-6 text-foreground">
            {questionText}
          </h2>

          {/* Multiple Choice Options */}
          {question.type === 'multiple_choice' && parsedOptions && (
            <div className="space-y-3 mb-6">
              {parsedOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedAnswer(option.id)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    selectedAnswer === option.id
                      ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue'
                      : 'border-border hover:border-cyber-blue/50 hover:bg-cyber-dark/50'
                  } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="font-mono mr-3 text-muted-foreground">
                    [{index + 1}]
                  </span>
                  {option.text}
                </button>
              ))}
            </div>
          )}

          {/* True/False Options */}
          {question.type === 'true_false' && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSelectedAnswer(true)}
                disabled={hasSubmitted}
                className={`flex-1 py-4 rounded-lg border font-semibold transition-all ${
                  selectedAnswer === true
                    ? 'border-green-500 bg-green-500/10 text-green-500'
                    : 'border-border hover:border-green-500/50'
                } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                [T] True
              </button>
              <button
                onClick={() => setSelectedAnswer(false)}
                disabled={hasSubmitted}
                className={`flex-1 py-4 rounded-lg border font-semibold transition-all ${
                  selectedAnswer === false
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-border hover:border-red-500/50'
                } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                [F] False
              </button>
            </div>
          )}

          {/* Terminal Command Input */}
          {question.type === 'terminal_command' && (
            <div className="mb-6">
              <div className="bg-cyber-darker border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-cyber-green font-mono">
                  <span className="text-muted-foreground">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    disabled={hasSubmitted}
                    autoFocus
                    className={`flex-1 bg-transparent outline-none text-cyber-green ${
                      hasSubmitted ? 'opacity-50' : ''
                    }`}
                    placeholder="Type your command..."
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to submit
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={hasSubmitted}
              className="px-6 py-2 bg-cyber-dark border border-border rounded-lg hover:bg-cyber-darker text-muted-foreground disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                hasSubmitted ||
                (question.type !== 'terminal_command' && selectedAnswer === null)
              }
              className="flex-1 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {hasSubmitted ? 'Submitted...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
