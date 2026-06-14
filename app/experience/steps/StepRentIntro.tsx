'use client';

import { useState, useEffect } from 'react';
import { StepWrapper } from '../components';

interface Props {
  onContinue: () => void;
}

const TEXT = "Now, about renting.";
const CHAR_MS = 42;
const POST_PAUSE = 1100;

export function StepRentIntro({ onContinue }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      let i = 0;
      iv = setInterval(() => {
        i++;
        setDisplayed(TEXT.slice(0, i));
        if (i >= TEXT.length) {
          clearInterval(iv);
          setDone(true);
        }
      }, CHAR_MS);
    }, 200);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onContinue, POST_PAUSE);
    return () => clearTimeout(t);
  }, [done, onContinue]);

  return (
    <StepWrapper
      headingVariant="cinematic"
      heading={<>{displayed}{!done && <span className="cursor-blink">|</span>}</>}
    />
  );
}
