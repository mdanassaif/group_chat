'use client'
import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { database } from '../firebase';
import { ref, onValue, push, set, off, get, update, onDisconnect } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import multiavatar from '@multiavatar/multiavatar';
import Modal from './modalbox';
import EmojiSVG from '../../public/emoji.svg';
import PhotoSVG from '../../public/photo.svg';
import axios from 'axios';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Filter from 'bad-words';
import type { Message as ChatMessage, TypingUser, OnlineUser, Group, CreateGroupModalProps } from '../types/ChatInterface';
import Auth from './Auth';

const filter = new Filter();

// Add new interface for group creation cooldown
interface GroupCreationCooldown {
  lastCreated: number;
  count: number;
}

// Add new interface for AI responses
interface AIResponse {
  trigger: string;
  response: string;
}

// Add AI response patterns
const AI_RESPONSES: AIResponse[] = [
  {
    trigger: "hey ai",
    response: "Hey there! 👋 I'm your AI assistant. How can I help you today?"
  },
  {
    trigger: "/help",
    response: "I'm here to help! Try asking me anything about:\n- Technology\n- Programming\n- General knowledge\n- Or just chat with me!"
  }
];

// Add new type for chat types
type ChatType = 'global' | 'ai' | 'group';

// Update ChatState interface
interface ChatState {
  selectedGroupId: string | null;
  chatType: ChatType;
  groups: Group[];
  showCreateGroup: boolean;
  newGroupForm: {
    name: string;
    description: string;
  };
}

// Add new interfaces
interface UserData {
  messageCount: number;
  isGuest: boolean;
}

// Add this interface for Hugging Face response
interface HuggingFaceResponse {
  generated_text: string;
}

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
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate group name
    if (groupName.length < 3) {
      setError('Group name must be at least 3 characters long');
      return;
    }
    
    if (groupName.length > 30) {
      setError('Group name must be less than 30 characters');
      return;
    }
    
    // Validate description
    if (groupDescription.length > 100) {
      setError('Description must be less than 100 characters');
      return;
    }
    
    onSubmit(groupName, groupDescription);
    setGroupName('');
    setGroupDescription('');
    setError('');
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

// Update the message interface to ensure proper typing
interface Message {
  id: string;
  text: string;
  timestamp: number;
  user: string;
  avatarUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  formattedText?: string;
  messageType?: 'text' | 'image' | 'gif';
  mediaUrl?: string;
  groupId?: string | null;
  chatType?: ChatType;
}

// Main Chat component
const Chat: React.FC = () => {
  // Core state management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showEmojiMenuPosition, setShowEmojiMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [username, setUsername] = useState<string>('');
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
  const [onlineUsers, setOnlineUsers] = useState<{ user: string; lastSeen: number }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatState>({
    selectedGroupId: null,
    chatType: 'global',
    groups: [],
    showCreateGroup: false,
    newGroupForm: {
      name: '',
      description: ''
    }
  });

  const [joinModalGroup, setJoinModalGroup] = useState<Group | null>(null);

  // Add new state for group creation cooldown
  const [groupCreationCooldown, setGroupCreationCooldown] = useState<GroupCreationCooldown>({
    lastCreated: 0,
    count: 0
  });

  const [showSidebar, setShowSidebar] = useState(false);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Add authentication handler
  const handleAuthComplete = async (username: string, isGuest: boolean) => {
    if (!auth.currentUser) return;

    const userRef = doc(firestore, 'users', auth.currentUser.uid);
    const userData: UserData = {
      messageCount: 0,
      isGuest
    };

    await setDoc(userRef, userData);
    setUserData(userData);
    setUsername(username);
    setIsAuthenticated(true);
  };

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
          user => {
            const lastSeen = user.lastActive;
            return Date.now() - lastSeen < 60000;
          }
        );
        const formattedUsers = recentlyActiveUsers.map(user => ({
          user: user.user,
          lastSeen: user.lastActive
        }));
        setOnlineUsers(formattedUsers);
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
        setMessages(messagesArray as Message[]);
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
    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);
      
      // User message
      const newMessageData = {
        id: uuidv4(),
        text: newMessage, // Remove escapeHTML here
        timestamp: Date.now(),
        user: username,
        avatarUrl: avatarUrl,
        backgroundColor: randomLightColor(),
        textColor: '#000000',
        groupId: chatState.selectedGroupId,
        chatType: chatState.chatType
      };

      await set(newMessageRef, newMessageData);
      setNewMessage('');
      resetFormatting();

      // Handle AI responses
      if (chatState.chatType === 'ai') {
        const botMessageRef = push(messagesRef);
        const aiResponse = await simulateBotResponse(newMessage);
        
        const botMessage = {
          id: uuidv4(),
          text: aiResponse, // The actual response text
          timestamp: Date.now(),
          user: 'AI Assistant',
          avatarUrl: '/ai-avatar.jpg',
          backgroundColor: '#f0f7ff',
          textColor: '#000000',
          chatType: chatState.chatType
        };
        
        await set(botMessageRef, botMessage);
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('chatUsername');
      setUsername('');
      setIsUsernameSet(false);
      setAvatarUrl('');
      setIsAuthenticated(false);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
    const lowercaseMessage = message.trim().toLowerCase();

    // Check for command-based responses first
    if (lowercaseMessage === '/fact') {
      return await getRandomFact();
    } else if (lowercaseMessage === '/joke') {
      return await getRandomJoke();
    } else if (lowercaseMessage === '/advice') {
      return await getRandomAdvice();
    }

    // Use Hugging Face for AI responses
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
        {
          inputs: message,
          parameters: {
            max_length: 100,
            temperature: 0.7,
            top_p: 0.9,
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const result = response.data[0] as HuggingFaceResponse;
      return result.generated_text;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I'm having trouble understanding right now. Could you try rephrasing that?";
    }
  };

  // Add new function to generate topic responses
  const generateTopicResponse = (topic: string) => {
    const responses: { [key: string]: string } = {
      "nextjs": "Next.js is a React framework that enables features like server-side rendering and static site generation. It's great for building production-ready React applications!",
      "react": "React is a JavaScript library for building user interfaces. It lets you create reusable UI components that manage their own state.",
      "typescript": "TypeScript is a strongly typed programming language that builds on JavaScript. It adds optional static types to help catch errors early.",
      // Add more topics as needed
    };

    return responses[topic.toLowerCase()] || 
      `I'd be happy to help you learn about ${topic}! Could you be more specific about what you'd like to know?`;
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
    if (!auth.currentUser) return;

    // Check if user is guest
    if (userData?.isGuest) {
      alert('Guest users cannot create groups. Please sign in with Google to create groups.');
      return;
    }

    const groupsRef = ref(database, 'groups');
    const newGroupRef = push(groupsRef);
    const groupId = newGroupRef.key;

    const newGroup = {
      id: groupId,
      name,
      description,
      createdBy: username,
      createdAt: Date.now(),
      members: [username]
    };

    try {
      await set(newGroupRef, newGroup);
      setChatState(prev => ({
        ...prev,
        groups: [...prev.groups, {
          id: groupId as string,
          name,
          description,
          createdBy: username,
          createdAt: Date.now(),
          members: [username]
        }],
        showCreateGroup: false
      }));
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  // Add useEffect for loading groups
  useEffect(() => {
    if (!isAuthenticated) return;

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

    return () => {
      off(groupsRef);
    };
  }, [isAuthenticated]);

  // Add useEffect for loading messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const messagesRef = ref(database, 'messages');
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray = Object.values(data) as Message[];
        setMessages(messagesArray);
      }
    });

    return () => {
      off(messagesRef);
    };
  }, [isAuthenticated]);

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

  // Update group list UI
  const renderGroupList = () => (
    <div className="space-y-2">
      {/* Global Chat Button */}
      <button
        onClick={() => setChatState(prev => ({ ...prev, selectedGroupId: null, chatType: 'global' }))}
        className={`
          w-full p-3 rounded-lg transition-all transform hover:scale-102
          flex items-center space-x-3
          ${(!chatState.selectedGroupId && chatState.chatType === 'global')
            ? 'bg-[#f26c6a] text-white shadow-md' 
            : 'bg-white hover:bg-gray-50'
          }
        `}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-medium">Global Chat</h3>
          <p className="text-sm opacity-75">Chat with everyone & AI assistant</p>
        </div>
      </button>

      {/* AI Chat Button - New */}
      <button
        onClick={() => setChatState(prev => ({ ...prev, selectedGroupId: null, chatType: 'ai' }))}
        className={`
          w-full p-3 rounded-lg transition-all transform hover:scale-102
          flex items-center space-x-3
          ${(!chatState.selectedGroupId && chatState.chatType === 'ai')
            ? 'bg-[#f26c6a] text-white shadow-md' 
            : 'bg-white hover:bg-gray-50'
          }
        `}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-medium">AI Assistant</h3>
          <p className="text-sm opacity-75">Chat directly with NextJS Bot</p>
        </div>
      </button>

      {/* Existing groups */}
      {chatState.groups.map(group => (
        <button
          key={group.id}
          onClick={() => handleGroupClick(group)}
          className={`w-full p-3 rounded-lg transition-all transform hover:scale-102 ${
            chatState.selectedGroupId === group.id 
              ? 'bg-[#f26c6a] text-white shadow-md' 
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <div
                  dangerouslySetInnerHTML={{
                    __html: multiavatar(group.name)
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full px-2 py-1">
                {group.members.length}
              </span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium">{group.name}</h3>
              <p className="text-sm text-gray-500 truncate">
                {group.description || 'No description'}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  // Replace both renderMessage functions with this single version
  const renderMessage = (message: Message) => (
    <div key={message.id} 
      className={`flex items-start mb-4 ${
        message.user === username ? 'flex-row-reverse' : ''
      }`}
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0">
        {message.user === 'AI Assistant' ? (
          <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{
              __html: multiavatar(message.user || 'Anonymous')
            }}
            style={{ transform: 'scale(1.5)' }}
          />
        )}
      </div>

      <div className={`mx-2 sm:mx-3 p-2 sm:p-3 rounded-lg shadow-sm max-w-[80%] sm:max-w-[70%] ${
        message.user === username 
          ? 'bg-[#f26c6a] text-white' 
          : message.user === 'AI Assistant'
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
            : 'bg-white'
      }`}>
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm truncate mr-2">
              {message.user}
            </span>
            <span className="text-xs opacity-75">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {message.messageType === 'image' ? (
            <img 
              src={message.mediaUrl} 
              alt={`Image from ${message.user}`}
              className="max-w-full rounded-lg"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
              loading="lazy"
            />
          ) : message.messageType === 'gif' ? (
            <img 
              src={message.mediaUrl} 
              alt={`GIF from ${message.user}`}
              className="max-w-full rounded-lg"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
              loading="lazy"
            />
          ) : (
            <div className="break-words text-sm">
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Add new functions for handling media
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please choose a file under 5MB.');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WEBP).');
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64String = reader.result as string;
        
        // Send the message with the base64 image
        const messagesRef = ref(database, 'messages');
        const newMessageRef = push(messagesRef);
        
        const newMessageData: Message = {
          id: uuidv4(),
          text: '',
          timestamp: Date.now(),
          user: username,
          avatarUrl: avatarUrl,
          backgroundColor: randomLightColor(),
          textColor: '#000000',
          messageType: 'image',
          mediaUrl: base64String,
          groupId: chatState.selectedGroupId,
          chatType: chatState.chatType
        };

        await set(newMessageRef, newMessageData);
        setIsUploading(false);
      };

      reader.onerror = (error) => {
        throw error;
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleGifSelect = async (gif: any) => {
    if (!auth.currentUser) return;

    try {
      const gifUrl = gif.images.original.url;
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);
      
      const newMessageData: Message = {
        id: uuidv4(),
        text: '',
        timestamp: Date.now(),
        user: username,
        avatarUrl: avatarUrl,
        backgroundColor: randomLightColor(),
        textColor: '#000000',
        messageType: 'gif',
        mediaUrl: gifUrl,
        groupId: chatState.selectedGroupId,
        chatType: chatState.chatType
      };

      await set(newMessageRef, newMessageData);
      setShowGifPicker(false);
    } catch (error) {
      console.error('Error sending GIF:', error);
      alert('Failed to send GIF. Please try again.');
    }
  };

  const sendMediaMessage = async (url: string, type: 'image' | 'gif') => {
    if (!auth.currentUser) return;

    try {
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);

      const newMessageData: Message = {
        id: uuidv4(),
        text: '', // Empty text for media messages
        timestamp: Date.now(),
        user: username,
        avatarUrl: avatarUrl,
        backgroundColor: randomLightColor(),
        textColor: '#000000',
        messageType: type,
        mediaUrl: url,
        groupId: chatState.selectedGroupId,
        chatType: chatState.chatType
      };

      await set(newMessageRef, newMessageData);
    } catch (error) {
      console.error('Error sending media message:', error);
      alert('Failed to send media. Please try again.');
    }
  };

  // Update the message container to show empty state
  const renderMessagesContainer = () => {
    const filteredMessages = Object.entries(groupedMessages).flatMap(([date, messages]) =>
      messages.filter(message => {
        if (chatState.selectedGroupId) {
          return message.groupId === chatState.selectedGroupId;
        }
        return message.chatType === chatState.chatType;
      })
    );

    if (filteredMessages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-r from-[#f26c6a] to-[#e53935] flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Messages Yet</h3>
          <p className="text-gray-600 mb-4">Be the first one to start the conversation!</p>
          <button
            onClick={() => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus()}
            className="px-6 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] transition-colors"
          >
            Start Chatting
          </button>
        </div>
      );
    }

    return (
      <>
        {Object.entries(groupedMessages).map(([date, messages]) => {
          const filteredMessages = messages.filter(message => {
            if (chatState.selectedGroupId) {
              return message.groupId === chatState.selectedGroupId;
            }
            return message.chatType === chatState.chatType;
          });

          return filteredMessages.length > 0 ? (
            <div key={date}>
              <div className="text-center text-sm text-gray-500 my-2">{date}</div>
              {filteredMessages.map(message => renderMessage(message))}
            </div>
          ) : null;
        })}
      </>
    );
  };

  // Add remaining messages counter for guests
  const renderRemainingMessages = () => {
    if (!userData?.isGuest) return null;

    const remaining = 20 - userData.messageCount;
    return (
      <div className="text-sm text-gray-500 mt-2">
        {remaining} messages remaining
      </div>
    );
  };

  // Update the GifPicker component
  const GifPicker = () => {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchGifs = async (query: string = 'trending') => {
      setLoading(true);
      try {
        const response = await axios.get(
          `https://api.giphy.com/v1/gifs/search?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&q=${query}&limit=20&rating=g`
        );
        setGifs(response.data.data);
      } catch (error) {
        console.error('Error fetching GIFs:', error);
        alert('Failed to load GIFs. Please try again.');
      }
      setLoading(false);
    };

    // Load trending GIFs on component mount
    useEffect(() => {
      searchGifs();
    }, []);

    return (
      <div className="absolute bottom-20 right-4 z-50 bg-white rounded-lg shadow-xl p-4 w-80 h-96">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) searchGifs(e.target.value);
              }}
              placeholder="Search GIFs..."
              className="flex-1 p-2 border rounded-lg mr-2"
            />
            <button 
              onClick={() => setShowGifPicker(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
            {loading ? (
              <div className="col-span-2 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26c6a]"></div>
              </div>
            ) : (
              gifs.map((gif) => (
                <div 
                  key={gif.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  onClick={() => handleGifSelect(gif)}
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt="GIF"
                    className="w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                </div>
              ))
            )}
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            Powered by GIPHY
          </div>
        </div>
      </div>
    );
  };

  // Update the useEffect for authentication persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        // Load user data from Firestore
        const loadUserData = async () => {
          const userRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
            setUsername(user.displayName || 'Anonymous');
          }
        };
        loadUserData();
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        setUsername('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Add this useEffect to track online users
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    const onlineUsersRef = ref(database, 'onlineUsers');
    const userStatusRef = ref(database, `onlineUsers/${username}`);
    const userStatus = {
      user: username,
      lastSeen: Date.now()
    };

    // Set user as online
    set(userStatusRef, userStatus);

    // Update user's last seen every minute
    const intervalId = setInterval(() => {
      update(userStatusRef, { lastSeen: Date.now() });
    }, 60000);

    // Remove user when they go offline
    onDisconnect(userStatusRef).remove();

    // Listen for online users changes
    onValue(onlineUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.values(data) as { user: string; lastSeen: number }[];
        // Filter out current user and inactive users
        const activeUsers = usersArray.filter(
          user => 
            user.user !== username && // Exclude current user
            Date.now() - user.lastSeen < 5 * 60 * 1000 // Only show users active in last 5 minutes
        );
        setOnlineUsers(activeUsers);
      } else {
        setOnlineUsers([]);
      }
    });

    return () => {
      clearInterval(intervalId);
      set(userStatusRef, null);
      off(onlineUsersRef);
    };
  }, [isAuthenticated, username]);

  // Update the renderOnlineUsers function
  const renderOnlineUsers = () => (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Other Users Online ({onlineUsers.length})
      </h3>
      {onlineUsers.length > 0 ? (
        onlineUsers.map(user => (
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
        ))
      ) : (
        <div className="text-sm text-gray-500">No other users online</div>
      )}
    </div>
  );

  return (
    <>
      {!isAuthenticated ? (
        <Auth onAuthComplete={handleAuthComplete} />
      ) : (
        <div className="flex flex-row h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
          {/* Mobile Menu Toggle Button - New */}
          <button 
            onClick={() => setShowSidebar(prev => !prev)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          {/* Left Sidebar - Updated with responsive classes */}
          <div className={`
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            z-40
            w-80 lg:w-64
            h-full
            bg-white
            border-r border-gray-200
            overflow-y-auto
            transition-transform duration-300 ease-in-out
            shadow-lg lg:shadow-none
          `}>
            {/* Sidebar Header - New */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Chat Groups</h2>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Rest of sidebar content */}
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
              

              {/* Groups List */}
              {renderGroupList()}
            </div>

            {/* Online Users */}
            {renderOnlineUsers()}
          </div>

          {/* Main Chat Area - Updated with responsive classes */}
          <div className="flex-1 flex flex-col w-full lg:w-auto">
            {/* Chat Header - Updated */}
            <div className="bg-white p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-800 truncate">
                    {chatState.selectedGroupId
                      ? chatState.groups.find(g => g.id === chatState.selectedGroupId)?.name
                      : chatState.chatType === 'ai'
                        ? 'AI Assistant'
                        : 'Global Chat'
                    }
                  </h2>
                  {chatState.chatType === 'ai' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Try saying "hey nextjsbot" or ask about Next.js, React, or TypeScript
                    </p>
                  )}
                  {typingUsers.length > 0 && (
                    <div className="text-sm text-gray-500 italic mt-1 truncate">
                      {typingUsers.map(user => user.user).join(', ')}
                      {typingUsers.length === 1 ? ' is ' : ' are '}
                      typing...
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Logout
                </button>
                {renderRemainingMessages()}
              </div>
            </div>

            {/* Messages Container - Updated */}
            <div
              ref={messagesContainerRef}
              className="flex-1 p-2 sm:p-4 overflow-y-auto bg-gradient-to-r from-[#f86b698e] to-[#e8f0a49b]"
            >
              {/* Update message bubbles for better mobile display */}
              {renderMessagesContainer()}
            </div>

            {/* Input Area - Updated */}
            <div className="bg-white p-2 sm:p-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  ref={emojiButtonRef}
                  onClick={toggleEmojiMenu}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Image src={EmojiSVG} alt="Emoji" width={20} height={20} className="sm:w-6 sm:h-6" />
                </button>
                
                {/* Image upload button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  disabled={isUploading}
                >
                  <Image src={PhotoSVG} alt="Upload" width={20} height={20} className="sm:w-6 sm:h-6" />
                </button>

                {/* GIF button */}
                <button
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12.5h-1.5V14h-2v1.5H6v-3h1.5V14h2v-1.5H11v3zm3.5 0h-1.5V9H15v6.5zm3.5 0h-1.5V9H19v6.5z"/>
                  </svg>
                </button>

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

              {/* GIF Picker */}
              {showGifPicker && (
                <GifPicker />
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-grow px-3 py-2 text-sm sm:text-base rounded-lg border focus:ring-2 focus:ring-[#f26c6a] focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 sm:px-6 py-2 bg-[#f26c6a] text-white rounded-lg hover:bg-[#e53935] transition-colors whitespace-nowrap"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
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
            top: Math.min(showEmojiMenuPosition.top, window.innerHeight - 200),
            left: Math.min(showEmojiMenuPosition.left, window.innerWidth - 200)
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
    </>
  )

};

export default Chat;
