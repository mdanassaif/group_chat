'use client';

import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { database } from '../firebase';
import { ref, onValue, push, set, off } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import EmojiSVG from '../../public/emoji.svg';
import PhotoSVG from '../../public/photo.svg';
import multiavatar from '@multiavatar/multiavatar';
import Modal from './modalbox';

interface Message {
  id: string;
  text?: string;
  formattedText?: string;
  imageUrl?: string;
  timestamp: number;
  user: string;
  avatarUrl: string;
}

 

const Chat: React.FC = () => {
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const newMessageData: Message = {
      id: uuidv4(),
      text: newMessage,
      formattedText: applyMessageFormatting(newMessage),
      timestamp: Date.now(),
      user: username,
      avatarUrl: avatarUrl,
    };

    try {
      await set(newMessageRef, newMessageData);
      setNewMessage('');
      resetFormatting();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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

  const resetFormatting = () => {
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
  };

  const sendImage = async (imageUrl: string) => {
    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const newMessageData: Message = {
      id: uuidv4(),
      timestamp: Date.now(),
      user: username,
      imageUrl,
      avatarUrl: avatarUrl,
    };

    try {
      await set(newMessageRef, newMessageData);
    } catch (error) {
      console.error('Error sending image:', error);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prevMessage) => prevMessage + emoji);
    setShowEmojiMenu(false);
  };

  const toggleEmojiMenu = () => {
    if (emojiButtonRef.current) {
      const emojiButtonRect = emojiButtonRef.current.getBoundingClientRect();
      setShowEmojiMenu(!showEmojiMenu);
      setShowEmojiMenuPosition({ top: emojiButtonRect.bottom, left: emojiButtonRect.left });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleUsernameSubmit = async () => {
    if (username.trim() !== '') {
      const response = await fetch(`https://api.multiavatar.com/${username}`);
      const avatarSvg = await response.text();
      const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;
      setAvatarUrl(avatarUrl);
      setIsUsernameSet(true);

      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100">
      {!isUsernameSet ? (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b]">
          <h1 className="text-3xl font-bold mb-2 text-[#4b6062] animate-fadeIn">Join the Live Chat</h1>
          <p className="text-md text-[#0f456f] mb-4 animate-fadeIn">Gossip joyfully and openly with friends</p>
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

          <p
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-[#092943] text-md cursor-pointer underline"
            onClick={() => setShowModal(true)}
          >
            How It Works ?
          </p>

          {showModal && <Modal onClose={() => setShowModal(false)} />}
        </div>
      ) : (
        <div className="flex flex-col flex-1 h-full bg-white rounded-lg overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4  overflow-y-auto bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b] messages-container animate-fadeIn"
            style={{ height: '85%', paddingTop: '15px'}}
          >
            {messages.map((message) => (
              <div className="flex items-start mb-4 animate-slideIn" key={message.id}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={message.avatarUrl || multiavatar(username)} alt="Avatar" width={40} height={40} />
                </div>
                <div className="flex flex-col ml-3">
                  <div className="flex items-center">
                    <p className="font-semibold text-sm">{message.user}</p>
                    <p className="text-gray-500 text-[.65rem] ml-1">
                      {new Date(message.timestamp).toLocaleTimeString()} - {new Date(message.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={`${
                      message.user === username
                        ? 'bg-[#ccf1f690] text-[#233d40] px-4 py-2 rounded-lg'
                        : 'bg-[#f26c6a10] text-[#4b6062] px-4 py-2 rounded-lg'
                    }`}
                    dangerouslySetInnerHTML={{ __html: message.formattedText || '' }}
                  />
                  {message.imageUrl && (
                    <div className="bg-white rounded-lg overflow-hidden mt-2">
                      <Image
                        src={message.imageUrl}
                        alt="User sent image"
                        className="rounded-lg"
                        height={200}
                        width={200}
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-4" style={{ height: '15%' }}>
            <div className="flex items-center mb-2">
              <button onClick={toggleEmojiMenu} ref={emojiButtonRef} className="mr-3 p-2 focus:outline-none">
                <Image src={EmojiSVG} alt="Emoji" width={24} height={24} />
              </button>
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
              <button
                onClick={() => setIsBoldActive((prevState) => !prevState)}
                className={`mr-3 p-2 focus:outline-none ${isBoldActive}`}
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
            {showEmojiMenu && showEmojiMenuPosition && (
              <div
                className="absolute z-10 bg-white border rounded-lg shadow-lg p-2"
                style={{ top: showEmojiMenuPosition.top, left: showEmojiMenuPosition.left }}
              >
                <div className="grid grid-cols-10 gap-2">
                  {['😊', '😆', '😅', '😂', '😍', '🔥', '❤️', '🎉', '👍', '😎'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
