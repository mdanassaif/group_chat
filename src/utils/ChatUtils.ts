// ChatUtils.ts
import axios from 'axios';
import Filter from 'bad-words';
import { Message } from '../types/ChatInterface';

const filter = new Filter();

export const escapeHTML = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const randomLightColor = () => {
  return '#b7ebf2';
};

export const getRandomFact = async () => {
  try {
    const response = await axios.get('https://api.chucknorris.io/jokes/random');
    return response.data.value;
  } catch (error) {
    console.error('Error fetching random fact:', error);
    return 'Try Again Later or use other commands: /advice, /joke';
  }
};

export const getRandomJoke = async () => {
  try {
    const response = await axios.get('https://icanhazdadjoke.com/', {
      headers: { 'Accept': 'application/json' }
    });
    return response.data.joke;
  } catch (error) {
    console.error('Error fetching random joke:', error);
    return 'Try Again Later or use other commands: /advice, /fact';
  }
};

export const getRandomAdvice = async () => {
  try {
    const response = await axios.get('https://api.adviceslip.com/advice');
    return response.data.slip.advice;
  } catch (error) {
    console.error('Error fetching random advice:', error);
    return 'Try Again Later or use other commands: /joke, /fact';
  }
};

export const simulateBotResponse = async (message: string) => {
  const trimmedMessage = message.trim().toLowerCase();

  if (trimmedMessage === '/fact') {
    return await getRandomFact();
  } else if (trimmedMessage === '/joke') {
    return await getRandomJoke();
  } else if (trimmedMessage === '/advice') {
    return await getRandomAdvice();
  } else if (trimmedMessage.includes('bot') || trimmedMessage.includes('help')) {
    return "You can use the /joke, /fact, and /advice commands for interesting jokes, fact, and advice!";
  }

  return '';
};

export const applyMessageFormatting = (text: string, isBoldActive: boolean, isItalicActive: boolean, isUnderlineActive: boolean) => {
  let formattedText = text;
  if (isBoldActive) {
    formattedText = `<b>${formattedText}</b>`;
  }
  if (isItalicActive) {
    formattedText = `<i>${formattedText}</i>`;
  }
  if (isUnderlineActive) {
    formattedText = `<u>${formattedText}</u>`;
  }
  return formattedText;
};