'use client'
import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { database } from '../firebase';
import { ref, onValue, push, set, off } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import multiavatar from '@multiavatar/multiavatar';
import Modal from './modalbox';
import EmojiSVG from '../../public/emoji.svg';
import PhotoSVG from '../../public/photo.svg';

// Define Message interface
interface Message {
  id: string;
  text?: string;
  formattedText?: string;
  imageUrl?: string;
  timestamp: number;
  user: string;
  avatarUrl: string;
  backgroundColor?: string;
  textColor?: string;
}

// Chat component
const Chat: React.FC = () => {
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showEmojiMenuPosition, setShowEmojiMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Effect to fetch messages from database
  useEffect(() => {
    const messagesRef = ref(database, 'messages');
    let initialLoad = true;

    const handleNewMessage = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray: Message[] = Object.values(data) as Message[];
        setMessages(messagesArray);
        if (!initialLoad) {
          scrollToBottom();
        }
      }
      initialLoad = false;
    };

    onValue(messagesRef, handleNewMessage);

    return () => {
      off(messagesRef, 'value', handleNewMessage);
    };
  }, [isUsernameSet]);

  // Effect to scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Handler for message input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  // Function to send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const backgroundColor = randomLightColor();
    const newMessageData: Message = {
      id: uuidv4(),
      text: newMessage,
      formattedText: applyMessageFormatting(newMessage),
      timestamp: Date.now(),
      user: username,
      avatarUrl: avatarUrl,
      backgroundColor: backgroundColor,
      textColor: '#000000',
    };

    try {
      await set(newMessageRef, newMessageData);
      setNewMessage('');
      resetFormatting();
      handleBotResponse(newMessage); // Call function to handle bot response
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Function to handle bot response
  const handleBotResponse = async (message: string) => {
    const botResponse = simulateBotResponse(message);
    if (botResponse !== '') {
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);
      const botMessage: Message = {
        id: uuidv4(),
        text: botResponse,
        timestamp: Date.now(),
        user: 'Bot', // Set the bot's username or identifier
        avatarUrl: '/bot-avatar-url.png', // Replace with actual bot avatar URL
        backgroundColor: randomLightColor(),
        textColor: '#000000',
      };

      try {
        await set(newMessageRef, botMessage);
      } catch (error) {
        console.error('Error sending bot message:', error);
      }
    }
  };

  // Function to apply message formatting
  const applyMessageFormatting = (text: string) => {
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

  // Function to reset message formatting
  const resetFormatting = () => {
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
  };

  // Function to send image
  const sendImage = async (imageUrl: string) => {
    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const newMessageData: Message = {
      id: uuidv4(),
      timestamp: Date.now(),
      user: username,
      imageUrl,
      avatarUrl: avatarUrl,
      backgroundColor: randomLightColor(),
      textColor: '#000000',
    };

    try {
      await set(newMessageRef, newMessageData);
    } catch (error) {
      console.error('Error sending image:', error);
    }
  };

  // Handler for emoji click
  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prevMessage) => prevMessage + emoji);
    setShowEmojiMenu(false);
  };

  // Function to toggle emoji menu
  const toggleEmojiMenu = () => {
    if (emojiButtonRef.current) {
      const emojiButtonRect = emojiButtonRef.current.getBoundingClientRect();
      setShowEmojiMenu(!showEmojiMenu);
      setShowEmojiMenuPosition({ top: emojiButtonRect.bottom, left: emojiButtonRect.left });
    }
  };

  // Handler for key down events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Function to handle username submission
  const handleUsernameSubmit = async () => {
    if (username.trim() !== '') {
      // Simulating avatar fetch
      const avatarSvg = multiavatar(username);
      const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;
      setAvatarUrl(avatarUrl);
      setIsUsernameSet(true);

      // Clear messages on username change (optional)
      setMessages([]);
    }
  };

  // Function to generate random light color
  const randomLightColor = () => {
    return '#b7ebf2';
  };

  // Function to simulate bot response
  const simulateBotResponse = (message: string) => {
    const trimmedMessage = message.trim().toLowerCase();
    if (trimmedMessage === 'hi' || trimmedMessage === 'hi?' || trimmedMessage === 'hi!') {
      return "Your hi is cute, but I'm a bot.";
    }
    else if (trimmedMessage === 'Hello' || trimmedMessage === 'helo') {
      return "Hey, how's it going, but I'm a bot.";
    }
    return ''; // Return empty string for other messages
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100">
      {isUsernameSet ? (
        <div className="flex flex-col flex-1 h-full bg-white rounded-lg overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b] messages-container animate-fadeIn"
            style={{ height: '85%', paddingTop: '15px' }}
          >
            {/* Header to display current date */}
            <h2 className="text-center text-gray-500 text-sm mb-2">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            {/* Render messages */}
            {messages.map((message) => {
              const backgroundColor = message.backgroundColor || '#FFFFFF';
              const textColor = message.textColor || '#000000';
              const messageStyle = { backgroundColor, color: textColor };

              return (
                <div className={`flex items-start mb-4 animate-slideIn`} key={message.id}>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={message.avatarUrl || multiavatar(message.user)}
                      alt="Avatar"
                      width={40}
                      height={40}
                    />
                  </div>
                  <div className="ml-3 p-2 bg-white rounded-lg shadow-sm" style={messageStyle}>
                    <div
                      className="leading-tight"
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: message.formattedText || message.text || '' }}
                    />
                    {message.imageUrl && (
                      <div className="mt-2">
                        <Image src={message.imageUrl} alt="Sent Image" width={200} height={200} className="rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Input area for new messages */}
          <div className="bg-white p-4" style={{ height: '15%' }}>
            {/* Emoji, Photo, Formatting buttons */}
            <div className="flex items-center mb-2">
              {/* Emoji button */}
              <button onClick={toggleEmojiMenu} ref={emojiButtonRef} className="mr-3 p-2 focus:outline-none">
                <Image src={EmojiSVG} alt="Emoji" width={24} height={24} />
              </button>
              {/* Photo upload button */}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (reader.result) {
                        sendImage(reader.result as string);
                      }
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="imageInput"
              />
              <label htmlFor="imageInput" className="mr-3 p-2 cursor-pointer focus:outline-none">
                <Image src={PhotoSVG} alt="Photo" width={24} height={24} />
              </label>
              {/* Formatting buttons */}
              <button
                onClick={() => setIsBoldActive((prevState) => !prevState)}
                className={`mr-3 p-2 focus:outline-none ${isBoldActive ? 'font-bold' : ''}`}
              >
                Bold
              </button>
              <button
                onClick={() => setIsItalicActive((prevState) => !prevState)}
                className={`mr-3 p-2 focus:outline-none ${isItalicActive ? 'italic' : ''}`}
              >
                Italic
              </button>
              <button
                onClick={() => setIsUnderlineActive((prevState) => !prevState)}
                className={`mr-3 p-2 focus:outline-none ${isUnderlineActive ? 'underline' : ''}`}
              >
                Underline
              </button>
            </div>
            {/* Message input and send button */}
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className={`flex-grow px-4 py-2 rounded-lg border border-gray-300 focus:outline-none ${
                  isBoldActive ? 'font-bold' : ''
                } ${isItalicActive ? 'italic' : ''} ${isUnderlineActive ? 'underline' : ''} bg-white text-[#233d40]`}
              />
              <button
                onClick={sendMessage}
                className="ml-3 px-4 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] focus:outline-none"
              >
                Send
              </button>
            </div>
            {/* Emoji menu */}
            {showEmojiMenu && showEmojiMenuPosition && (
              <div
                className="fixed z-10 bg-white border rounded-lg shadow-lg p-2 animate__animated animate__fadeIn"
                style={{
                  top: showEmojiMenuPosition.top - 20, // Adjust positioning for better appearance
                  left: showEmojiMenuPosition.left,
                  marginBottom: '2rem', // Increase gap from the bottom
                }}
              >
                <div className="grid grid-cols-8 gap-2">
                  {['😊', '😂', '😍', '🔥', '❤️', '🎉', '👍', '😎'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="p-3 hover:bg-gray-200 rounded-lg text-xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Username input section
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b]">
          <h1 className="text-3xl font-bold mb-2 text-[#4b6062] animate-fadeIn">Join the Live Chat</h1>
          <p className="text-md text-[#0f456f] mb-4 animate-fadeIn">Gossip joyfully and openly with people</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="mb-4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none w-full max-w-sm"
          />
          <button
            onClick={handleUsernameSubmit}
            className="px-6 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] focus:outline-none w-full max-w-sm"
          >
            Start Chatting
          </button>

          {/* How It Works modal */}
          <p
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-[#092943] text-md cursor-pointer underline"
            onClick={() => setShowModal(true)}
          >
            How It Works ?
          </p>
          {showModal && <Modal onClose={() => setShowModal(false)} />}
        </div>
      )}
    </div>
  );
};

export default Chat;
