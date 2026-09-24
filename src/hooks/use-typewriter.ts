import { useState, useEffect } from "react";

/**
 * Simulates a typewriter effect: reveals `text` character by character.
 *
 * @param text      The full text to reveal.
 * @param speed     Milliseconds per character (default 30).
 * @param delay     Initial delay before typing starts (default 0).
 * @returns         An object with the current `output` string and a `done` flag.
 */
export function useTypewriter(
  text: string,
  speed = 30,
  delay = 0,
): { output: string; done: boolean } {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Reset whenever the text changes
    setIndex(0);
    setStarted(false);
  }, [text]);

  useEffect(() => {
    if (!text) {
      setIndex(0);
      return;
    }

    const delayTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(delayTimer);
  }, [text, delay]);

  useEffect(() => {
    if (!started || !text || index >= text.length) return;

    const timer = setInterval(() => {
      setIndex((prev) => {
        if (prev >= text.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [started, text, speed, index]);

  return {
    output: text ? text.slice(0, index) : "",
    done: !text || index >= text.length,
  };
}
