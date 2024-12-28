'use client'
import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { database } from '../firebase';
import { ref, onValue, push, set, off, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import multiavatar from '@multiavatar/multiavatar';
import Modal from './modalbox';
import EmojiSVG from '../../public/emoji.svg';
import PhotoSVG from '../../public/photo.svg';
import axios from 'axios';
import Filter from 'bad-words';
const filter = new Filter();
import { Message, TypingUser, OnlineUser, Group, ChatState, CreateGroupModalProps } from '../types/ChatInterface';


// Modal component for joining chat groups
const JoinGroupModal: React.FC<{
  isOpen: boolean;
  group: Group | null;
  onClose: () => void;
  onJoin: () => void;
}> = ({ isOpen, group, onClose, onJoin }) => {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Join {group.name}</h2>
        <div className="mb-4">
          <p className="text-gray-600 mb-4">{group.description}</p>
          <h3 className="font-bold mb-2">Group Rules:</h3>
          <ul className="list-disc pl-5 mb-4 text-gray-600">
            <li>Be respectful to all members</li>
            <li>No spam or inappropriate content</li>
            <li>Stay on topic with group discussions</li>
            <li>Follow the chat's general guidelines</li>
          </ul>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="form-checkbox text-[#f26c6a]"
            />
            <span className="text-sm text-gray-700">
              I agree to follow the group rules
            </span>
          </label>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            disabled={!accepted}
            className={`px-4 py-2 rounded-lg transition-colors ${accepted
              ? 'bg-[#f26c6a] text-white hover:bg-[#e53935]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            Join Group
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal component for creating new chat groups
const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onSubmit(groupName, groupDescription);
      setGroupName('');
      setGroupDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Group Name*
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f26c6a]"
              placeholder="Enter group name"
              maxLength={30}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f26c6a]"
              placeholder="Enter group description"
              maxLength={100}
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] transition-colors"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



// Main Chat component
const Chat: React.FC = () => {
  // Core state management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showEmojiMenuPosition, setShowEmojiMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [username, setUsername] = useState<string>(() => {
    // Initialize username from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatUsername') || '';
    }
    return '';
  });
  const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [showProfanityModal, setShowProfanityModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState<string>('');
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [showWordLimitModal, setShowWordLimitModal] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatState>({
    selectedGroupId: null,
    groups: [],
    showCreateGroup: false,
    newGroupForm: {
      name: '',
      description: ''
    }
  });

  const [joinModalGroup, setJoinModalGroup] = useState<Group | null>(null);

  const handleGroupClick = (group: Group) => {
    if (!group.members.includes(username)) {
      setJoinModalGroup(group);
    } else {
      setChatState(prev => ({ ...prev, selectedGroupId: group.id }));
    }
  };

  const handleJoinGroup = async () => {
    if (joinModalGroup) {
      await joinGroup(joinModalGroup.id);
      setJoinModalGroup(null);
    }
  };

  // Add typing state
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);


  const escapeHTML = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const createAvatarUrl = (svg: string) => {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  };

  // Helper function to format date
  const formatDate = (timestamp: number) => {
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Track online users and typing status
  useEffect(() => {
    if (!isUsernameSet || !username) return;

    const userPresenceRef = ref(database, `presence/${username}`);
    const onlineUsersRef = ref(database, 'presence');

    // Update user's online status every 30 seconds
    const updatePresence = () => {
      set(userPresenceRef, {
        user: username,
        lastActive: Date.now(),
        avatarUrl: avatarUrl
      });
    };

    // Initial presence update
    updatePresence();

    // Set up presence interval
    const presenceInterval = setInterval(updatePresence, 30000);

    // Listen for online users
    onValue(onlineUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activeUsers = Object.values(data) as OnlineUser[];
        // Filter out users who haven't been active in the last minute
        const recentlyActiveUsers = activeUsers.filter(
          user => Date.now() - user.lastActive < 60000
        );
        setOnlineUsers(recentlyActiveUsers);
      }
    });

    // Cleanup
    return () => {
      clearInterval(presenceInterval);
      set(userPresenceRef, null);
    };
  }, [isUsernameSet, username, avatarUrl]);

  // Load messages from Firebase
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
    // Show the "Live" word after 2 seconds
    const timer = setTimeout(() => {
      setShowLive(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);



  //scrolling effect bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Handler for message input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const allowedEmojis = ['😊', '😂', '😍', '🔥', '❤️', '🎉', '👍'];

  // Message sending logic
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Validate message length and spam prevention
    if (newMessage.trim().length > 70) {
      setShowWordLimitModal(true);
      return;
    }

    // Check for spam
    if (newMessage.trim() === lastSentMessage.trim()) {
      const currentTime = Date.now();
      const cooldownTime = 15000;

      if (currentTime - lastSentTime < cooldownTime) {
        console.log(`Please wait ${Math.ceil((cooldownTime - (currentTime - lastSentTime)) / 1000)} seconds before sending the same message again.`);
        return;
      }
    }

    setLastSentMessage(newMessage);
    setLastSentTime(Date.now());

    // Check for allowed emojis and English text
    const containsAllowedEmoji = allowedEmojis.some(emoji => newMessage.includes(emoji));
    const containsEnglishText = /[a-zA-Z]/.test(newMessage);

    if (!containsAllowedEmoji && !containsEnglishText) {
      setShowLanguageModal(true);
      return;
    }

    if (filter.isProfane(newMessage)) {
      setShowProfanityModal(true);
      return;
    }

    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const backgroundColor = randomLightColor();

    // Use chatState.selectedGroupId instead of selectedGroup
    const newMessageData = {
      id: uuidv4(),
      text: escapeHTML(newMessage),
      formattedText: applyMessageFormatting(escapeHTML(newMessage)),
      timestamp: Date.now(),
      user: username,
      avatarUrl: avatarUrl,
      backgroundColor: backgroundColor,
      textColor: '#000000',
      groupId: chatState.selectedGroupId // Use the correct group ID from chatState
    };

    try {
      await set(newMessageRef, newMessageData);
      setNewMessage('');
      resetFormatting();

      // Only send bot response in global chat
      if (!chatState.selectedGroupId) {
        handleBotResponse(newMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };



  // Hhandler for  bot response
  const handleBotResponse = async (message: string) => {
    const botResponse = await simulateBotResponse(message);
    if (botResponse !== '') {
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);
      const botMessage: Message = {
        id: uuidv4(),
        text: botResponse,
        timestamp: Date.now(),
        user: 'NextJS BOT', // Set the bot's username or identifier
        avatarUrl: '/Bot-avatar-url.jpg', // Replace with actual bot avatar URL
        backgroundColor: '#ffffff',
        textColor: 'rgb(255, 0, 0)',
      };

      try {
        await set(newMessageRef, botMessage);
      } catch (error) {
        console.error('Error sending bot message:', error);
      }
    }
  };


  // Function to apply formatting in msgs
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
    const newMessageData = {
      id: uuidv4(),
      text: escapeHTML(newMessage),
      formattedText: applyMessageFormatting(escapeHTML(newMessage)),
      timestamp: Date.now(),
      user: username,
      backgroundColor: randomLightColor(),
      textColor: '#000000',
      groupId: chatState.selectedGroupId
    };

    try {
      await set(newMessageRef, newMessageData);
      setNewMessage('');
      resetFormatting();
      handleBotResponse(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handler for emoji 
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

  // Handler for key down events : for sending message on enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Function to handle username submission
  const handleUsernameSubmit = async () => {
    if (username.trim() !== '') {
      // Store username in localStorage
      localStorage.setItem('chatUsername', username.trim());

      const avatarSvg = multiavatar(username);
      const avatarUrl = createAvatarUrl(avatarSvg);
      setAvatarUrl(avatarUrl);
      setIsUsernameSet(true);
      setMessages([]);
    }
  };
  // Function to generate random light color
  const randomLightColor = () => {
    return '#b7ebf2';
  };

  const handleLogout = () => {
    localStorage.removeItem('chatUsername');
    setUsername('');
    setIsUsernameSet(false);
    setAvatarUrl('');
  };

  const getRandomFact = async () => {
    try {
      const response = await axios.get('https://api.chucknorris.io/jokes/random');
      return response.data.value;
    } catch (error) {
      console.error('Error fetching random fact:', error);
      return 'Try Again Later or use other commands: /advice, /joke';
    }
  };

  const getRandomJoke = async () => {
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





  const getRandomAdvice = async () => {
    try {
      const response = await axios.get('https://api.adviceslip.com/advice');
      return response.data.slip.advice;
    } catch (error) {
      console.error('Error fetching random advice:', error);
      return 'Try Again Later or use other commands: /joke, /fact';
    }
  };


  // Add these new bot command functions
  const getWeather = async (city: string) => {
    try {
      const response = await axios.get(`https://api.weatherapi.com/v1/current.json?key=00fac9608e5b18f252320138b9f76c54&q=${city}`);
      return `Weather in ${city}: ${response.data.current.condition.text}, Temperature: ${response.data.current.temp_c}°C`;
    } catch (error) {
      return "Sorry, I couldn't fetch the weather information.";
    }
  };

  const getCryptoPrice = async (crypto: string) => {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
      return `Current ${crypto} price: $${response.data[crypto].usd}`;
    } catch (error) {
      return "Sorry, I couldn't fetch the crypto price.";
    }
  };

  const translateText = async (text: string, targetLang: string) => {
    try {
      const response = await axios.post('https://translation.googleapis.com/language/translate/v2', {
        q: text,
        target: targetLang,
      });
      return response.data.translations[0].translatedText;
    } catch (error) {
      return "Sorry, I couldn't translate the text.";
    }
  };

  // Update the simulateBotResponse function
  const simulateBotResponse = async (message: string) => {
    const trimmedMessage = message.trim().toLowerCase();

    // Command handlers
    if (trimmedMessage === '/fact') {
      return await getRandomFact();
    } else if (trimmedMessage === '/joke') {
      return await getRandomJoke();
    } else if (trimmedMessage === '/advice') {
      return await getRandomAdvice();
    } else if (trimmedMessage.startsWith('/weather ')) {
      const city = trimmedMessage.replace('/weather ', '');
      return await getWeather(city);
    } else if (trimmedMessage.startsWith('/crypto ')) {
      const crypto = trimmedMessage.replace('/crypto ', '');
      return await getCryptoPrice(crypto);
    } else if (trimmedMessage.startsWith('/translate ')) {
      const [_, text, lang] = trimmedMessage.split(' ');
      return await translateText(text, lang);
    } else if (trimmedMessage === '/help') {
      return `Available commands:
    /fact - Get a random fact
    /joke - Get a random joke
    /advice - Get random advice
    /weather [city] - Get weather for a city
    /crypto [currency] - Get crypto price
    /translate [text] [language] - Translate text
    /help - Show this help message`;
    }

    // Basic conversation handling
    if (trimmedMessage.includes('hello') || trimmedMessage.includes('hi')) {
      return `Hello! How can I help you today?`;
    } else if (trimmedMessage.includes('thank')) {
      return `You're welcome! Let me know if you need anything else.`;
    } else if (trimmedMessage.includes('bye')) {
      return `Goodbye! Have a great day!`;
    } else if (trimmedMessage.includes('bot')) {
      return `I'm here to help! Try /help to see what I can do.`;
    }

    return '';
  };


  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
    const messageDate = new Date(message.timestamp).toLocaleDateString('en-US');
    if (!acc[messageDate]) {
      acc[messageDate] = [];
    }
    acc[messageDate].push(message);
    return acc;
  }, {} as { [key: string]: Message[] });




  // Add typing listener effect
  useEffect(() => {
    if (!isUsernameSet) return;

    const typingRef = ref(database, `typing/${selectedGroup || 'global'}`);

    onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typingData = Object.values(data) as TypingUser[];
        // Filter out stale typing indicators (older than 2 seconds)
        const activeTyping = typingData.filter(
          user => Date.now() - user.timestamp < 2000 && user.user !== username
        );
        setTypingUsers(activeTyping);
      } else {
        setTypingUsers([]);
      }
    });

    return () => off(typingRef);
  }, [isUsernameSet, selectedGroup, username]);

  // Group management functions
  const createGroup = async (name: string, description: string) => {
    if (!name.trim() || !username) return;

    const groupsRef = ref(database, 'groups');
    const newGroupRef = push(groupsRef);
    const groupId = newGroupRef.key;

    if (!groupId) return;

    const newGroup: Group = {
      id: groupId,
      name: name.trim(),
      description: description.trim(),
      members: [username],
      createdBy: username,
      createdAt: Date.now(),
      avatar: multiavatar(name) // Generate avatar for group
    };

    try {
      await set(newGroupRef, newGroup);
      setChatState(prev => ({
        ...prev,
        showCreateGroup: false,
        selectedGroupId: groupId
      }));
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  // Add group listener effect
  useEffect(() => {
    if (!isUsernameSet) return;

    const groupsRef = ref(database, 'groups');

    onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const groupsArray = Object.values(data) as Group[];
        setChatState(prev => ({
          ...prev,
          groups: groupsArray
        }));
      }
    });

    return () => off(groupsRef);
  }, [isUsernameSet]);

  // Improved typing indicator
  const handleTyping = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!username || !isUsernameSet) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing status
    const typingRef = ref(database, `typing/${chatState.selectedGroupId || 'global'}/${username}`);
    set(typingRef, {
      user: username,
      timestamp: Date.now()
    });

    // Set local typing state
    setIsTyping(true);

    // Clear typing status after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, null);
      setIsTyping(false);
    }, 2000);
  };

  const joinGroup = async (groupId: string) => {
    if (!username) return;

    const groupRef = ref(database, `groups/${groupId}`);

    try {
      // Get the current group data
      const snapshot = await get(groupRef);
      const groupData = snapshot.val() as Group;

      if (!groupData) {
        console.error('Group not found');
        return;
      }

      // Add the user to members if not already present
      if (!groupData.members.includes(username)) {
        const updatedMembers = [...groupData.members, username];

        // Update the members array in Firebase
        await set(ref(database, `groups/${groupId}/members`), updatedMembers);

        // Update local state
        setChatState(prev => ({
          ...prev,
          selectedGroupId: groupId,
          groups: prev.groups.map(g =>
            g.id === groupId
              ? { ...g, members: updatedMembers }
              : g
          )
        }));
      }
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
      {isUsernameSet ? (
        <div className="flex h-full">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            {/* Groups Section */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Groups</h3>
                <button
                  onClick={() => setChatState(prev => ({ ...prev, showCreateGroup: true }))}
                  className="px-3 py-1 bg-[#f26c6a] text-white rounded-lg text-sm hover:bg-[#e53935] transition-colors"
                >
                  Create Group
                </button>
              </div>

              {/* Global Chat Button */}
              <button
                onClick={() => setChatState(prev => ({ ...prev, selectedGroupId: null }))}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors mb-2 ${!chatState.selectedGroupId ? 'bg-[#f26c6a] text-white' : 'hover:bg-gray-100'
                  }`}
              >
                Global Chat
              </button>

              {/* Groups List */}
              {/* Groups List */}
              {chatState.groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group)} // New handler
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors mb-2 ${chatState.selectedGroupId === group.id ? 'bg-[#f26c6a] text-white' : 'hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: multiavatar(group.name)
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {group.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.members.length} members
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Online Users Section */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Online Users ({onlineUsers.length})</h3>
              {onlineUsers.map(user => (
                <div key={user.user} className="flex items-center mb-3">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: multiavatar(user.user)
                      }}
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <span className="ml-2 text-sm text-gray-700">{user.user}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            {/* Chat Header */}
            <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {chatState.selectedGroupId
                    ? chatState.groups.find(g => g.id === chatState.selectedGroupId)?.name
                    : 'Global Chat'}
                </h2>
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-500 italic mt-1">
                    {typingUsers.map(user => user.user).join(', ')}
                    {typingUsers.length === 1 ? ' is ' : ' are '}
                    typing...
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Messages Container */}
            <div
              ref={messagesContainerRef}
              className="flex-1 p-4 overflow-y-auto bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b]"
            >
              {Object.entries(groupedMessages).map(([date, messages]) => (
                <div key={date}>
                  <div className="text-center text-sm text-gray-500 my-2">{date}</div>
                  {messages
                    .filter(message =>
                      chatState.selectedGroupId
                        ? message.groupId === chatState.selectedGroupId
                        : !message.groupId
                    )
                    .map(message => (
                      <div key={message.id} className={`flex items-start mb-4 ${message.user === username ? 'flex-row-reverse' : ''
                        }`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {message.avatarUrl ? (
                            <div
                              className="w-full h-full"
                              dangerouslySetInnerHTML={{
                                __html: multiavatar(message.user)
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>

                        <div className={`mx-3 p-3 rounded-lg shadow-sm max-w-[70%] ${message.user === username ? 'bg-[#f26c6a] text-white' : 'bg-white'
                          }`}>
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-sm truncate mr-2">{message.user}</span>
                              <span className="text-xs opacity-75 flex-shrink-0">
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {message.imageUrl ? (
                              <Image
                                src={message.imageUrl}
                                alt="Sent image"
                                width={200}
                                height={200}
                                className="rounded-lg mt-2"
                              />
                            ) : (
                              <div
                                className="break-words text-sm"
                                dangerouslySetInnerHTML={{
                                  __html: message.formattedText || message.text || ''
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  ref={emojiButtonRef}
                  onClick={toggleEmojiMenu}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Image src={EmojiSVG} alt="Emoji" width={24} height={24} />
                </button>
                <label className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                  <Image src={PhotoSVG} alt="Photo" width={24} height={24} />

                </label>
                <button
                  onClick={() => setIsBoldActive(!isBoldActive)}
                  className={`p-2 rounded-md ${isBoldActive ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  B
                </button>
                <button
                  onClick={() => setIsItalicActive(!isItalicActive)}
                  className={`p-2 rounded-md ${isItalicActive ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  I
                </button>
                <button
                  onClick={() => setIsUnderlineActive(!isUnderlineActive)}
                  className={`p-2 rounded-md ${isUnderlineActive ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  U
                </button>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className={`flex-grow px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#f26c6a] focus:border-transparent ${isBoldActive ? 'font-bold' : ''
                    } ${isItalicActive ? 'italic' : ''} ${isUnderlineActive ? 'underline' : ''
                    }`}
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Username Input Screen
        <div className="flex flex-col items-center justify-center h-full p-4">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-[#6e0808]">
            Join the
            <span className="mx-1"></span>
            {showLive && (
              <span className="inline-block animate-flyIn">Live</span>
            )}
            <span className="mx-1"></span>
            Chat
          </h1>
          <p className="text-md text-[#ce0202e0] mb-6">
            Join the conversation with people around the world
          </p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="mb-4 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#f26c6a] focus:border-transparent w-full max-w-sm"
          />
          <button
            onClick={handleUsernameSubmit}
            className="px-6 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] w-full max-w-sm transition-colors"
          >
            Start Chatting
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={chatState.showCreateGroup}
        onClose={() => setChatState(prev => ({ ...prev, showCreateGroup: false }))}
        onSubmit={createGroup}
      />

      {/* Add this with other modals */}
      <JoinGroupModal
        isOpen={!!joinModalGroup}
        group={joinModalGroup}
        onClose={() => setJoinModalGroup(null)}
        onJoin={handleJoinGroup}
      />

      {showProfanityModal && (
        <Modal
          title="Warning: Profanity Detected"
          message="Please keep the chat clean and friendly."
          onClose={() => setShowProfanityModal(false)}
        />
      )}

      {showLanguageModal && (
        <Modal
          title="Language Not Supported"
          message="Please use English or allowed emojis only."
          onClose={() => setShowLanguageModal(false)}
        />
      )}

      {showWordLimitModal && (
        <Modal
          title="Message Too Long"
          message="Please keep your message under 70 characters."
          onClose={() => setShowWordLimitModal(false)}
        />
      )}

      {/* Emoji Menu */}
      {showEmojiMenu && showEmojiMenuPosition && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2"
          style={{
            top: showEmojiMenuPosition.top,
            left: showEmojiMenuPosition.left
          }}
        >
          <div className="grid grid-cols-4 gap-2">
            {allowedEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

};

export default Chat;
